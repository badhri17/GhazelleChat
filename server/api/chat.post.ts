import { eq, asc } from 'drizzle-orm'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import OpenAI from 'openai'
import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '~/server/db'
import { conversations, messages } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'
import { setAbortController, removeAbortController } from '~/server/utils/abortControllers'
import { validateIncomingAttachments, linkAttachmentsToMessage, IncomingAttachment, buildVendorAttachmentParts } from '~/server/utils/attachments'
import { buildAnthropicMessages } from '~/server/utils/anthropic'
import { buildOpenAIMessages } from '~/server/utils/openai'
import { buildGeminiMessages } from '~/server/utils/gemini'

const chatSchema = z.object({
  message: z.string(),
  attachments: z.array(z.object({
    id: z.string(),
    url: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
    size: z.number(),
  })).optional().default([]),
  conversationId: z.string().nullable().optional(),
  model: z.enum([
    'gpt-4o',
    'gpt-4o-mini',
    'claude-3-5-sonnet-latest',
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
    'llama-3.1-70b-versatile',
    'gemini-pro',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite'
  ]).default('gpt-4o-mini'),
  systemPrompt: z.string().optional().nullable()
})

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const sessionId = getCookie(event, lucia.sessionCookieName)
    if (!sessionId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const { session, user } = await lucia.validateSession(sessionId)
    if (!session) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid session'
      })
    }

    const body = await readBody(event)
    const { message, conversationId, model, attachments, systemPrompt } = chatSchema.parse(body)

    const validationErr = validateIncomingAttachments(model, attachments as IncomingAttachment[])
    if (validationErr) {
      throw createError({ statusCode: 400, statusMessage: validationErr })
    }

    let currentConversationId = conversationId

    if (!currentConversationId) {
      currentConversationId = nanoid()
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '')
      
      await db.insert(conversations).values({
        id: currentConversationId,
        userId: user.id,
        title,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    const userMessageId = nanoid()
    await db.insert(messages).values({
      id: userMessageId,
      conversationId: currentConversationId,
      role: 'user',
      content: message,
      status: 'complete',
      createdAt: new Date()
    })
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, currentConversationId))

    if (attachments && attachments.length > 0) {
      await linkAttachmentsToMessage(userMessageId, attachments as IncomingAttachment[])
    }
    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, currentConversationId))
      .orderBy(asc(messages.createdAt))

    const chatMessages: ChatMessage[] = history.map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim() !== '' && (model.startsWith('gpt-') || model.startsWith('llama-'))) {
      chatMessages.unshift({ role: 'system', content: systemPrompt.trim() })
    }

    if (attachments && attachments.length && !model.startsWith('claude-')) {
      const protocol = (event.node.req.headers['x-forwarded-proto'] as string) || 'http'
      const host = event.node.req.headers.host || 'localhost:3000'
      const baseUrl = `${protocol}://${host}`
      const vendorParts = buildVendorAttachmentParts(model, attachments as IncomingAttachment[], baseUrl)
      if (vendorParts.length) {
        // Append each part as ChatMessage type by mapping
        for (const part of vendorParts) {
          chatMessages.push({
            role: 'user',
            content: JSON.stringify(part)
          })
        }
      }
    }

    setHeader(event, 'Content-Type', 'text/stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')

    let clientDisconnected = false
    
    const handleReqClose = () => {
      if (!clientDisconnected) {
        clientDisconnected = true
        console.log('🔌 Client disconnected, but continuing generation...')
      }
    }
    const handleReqAborted = () => {
      if (!clientDisconnected) {
        clientDisconnected = true
        console.log('🔌 Client connection aborted, but continuing generation...')
      }
    }
    const handleReqError = (err: Error) => {
      if (!clientDisconnected) {
        clientDisconnected = true
        console.log('🔌 Client connection error, but continuing generation:', err.message)
      }
    }
    const handleResClose = () => {
      if (!clientDisconnected) {
        clientDisconnected = true
        console.log('🔌 Response closed, but continuing generation...')
      }
    }

    event.node.req.on('close', handleReqClose)
    event.node.req.on('aborted', handleReqAborted)
    event.node.req.on('error', handleReqError)
    event.node.res.on('close', handleResClose)
    
    console.log('📡 Starting streaming response, connection status:', {
      destroyed: event.node.req.destroyed,
      aborted: event.node.req.aborted,
      complete: event.node.req.complete,
      readableEnded: event.node.req.readableEnded,
      closed: event.node.req.closed
    })

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        let assistantMessageId = ''
        let userManuallyAborted = false
        let generationFailed = false

        if (clientDisconnected) {
          console.log('🛑 Connection lost before LLM request, aborting')
          controller.close()
          return
        }

        try {
          assistantMessageId = nanoid()
          const streamId = nanoid()
          
          await db.insert(messages).values({
            id: assistantMessageId,
            conversationId: currentConversationId,
            role: 'assistant',
            content: '',
            model,
            status: 'streaming',
            createdAt: new Date()
          })

          console.log('🚀 Starting stream:', streamId, 'for message:', assistantMessageId)

          // 🚀 Send the assistantMessageId immediately so the frontend can
          // call the stop endpoint even before the first LLM token arrives.
          try {
            if (!clientDisconnected) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ messageId: assistantMessageId })}\n\n`))
            }
          } catch (e) {
          }
          const abortController = new AbortController()

          setAbortController(assistantMessageId, abortController)

          try {
            if (model.startsWith('gpt-')) {
              const openai = new OpenAI({
                apiKey: config.openaiApiKey
              })

              const openaiMessages = await buildOpenAIMessages(chatMessages, attachments as IncomingAttachment[] | undefined, event)

              const requestPayload = {
                model,
                messages: openaiMessages,
                stream: true
              }

              // Log the request payload
              console.log('🚀 OpenAI API Request:', {
                url: 'https://api.openai.com/v1/chat/completions',
                method: 'POST',
                model,
                messageCount: openaiMessages.length,
                messages: openaiMessages.map(msg => {
                  if (typeof msg.content === 'string') {
                    return { role: msg.role, content: msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : '') }
                  }
                  // Handle array of parts for vision models
                  const contentParts = Array.isArray(msg.content) ? msg.content : []
                  const partsSummary = contentParts.map((part: any) => {
                    if (part.type === 'text') {
                      return `{text: "${part.text.slice(0, 40)}..."}`
                    }
                    if (part.type === 'image_url') {
                      return `{image_url: "${part.image_url.url.slice(0, 60)}..."}`
                    }
                    return '{unknown part}'
                  }).join(', ')
                  return { role: msg.role, content: `[${partsSummary}]` }
                }),
              })

              const startTime = Date.now()
              console.log('⏱️ Starting OpenAI request at:', new Date().toISOString())

              const stream = await openai.chat.completions.create({
                ...requestPayload,
                stream: true
              }, {
                signal: abortController.signal
              })

              const firstChunkTime = Date.now()
              console.log('⚡ First chunk received after:', firstChunkTime - startTime, 'ms')

              let chunkCount = 0
              try {
                for await (const chunk of stream) {
                  chunkCount++
                  const content = chunk.choices[0]?.delta?.content || ''
                  
                  if (chunkCount === 1) {
                    console.log('📦 First chunk content:', JSON.stringify(chunk, null, 2))
                  }
                  
                  if (content) {
                    fullResponse += content
                    
                    // Update database in real-time with new content
                    await db.update(messages)
                      .set({ content: fullResponse })
                      .where(eq(messages.id, assistantMessageId))
                    
                    try {
                      // Only send to client if still connected
                      if (!clientDisconnected) {
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
                      }
                    } catch (e) {
                      // Stream might be closed if client disconnected
                      if ((e as Error)?.message?.includes('closed')) {
                        console.log('🔌 Client stream closed, but continuing generation in background')
                        clientDisconnected = true
                      } else {
                        throw e
                      }
                    }
                  }

                  // Log every 50th chunk to avoid spam
                  if (chunkCount % 50 === 0) {
                    console.log(`📊 Processed ${chunkCount} chunks, response length: ${fullResponse.length}`)
                  }
                }
              } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                  console.log('🛑 OpenAI stream aborted by user.')
                  throw error // Re-throw to be caught by the main handler
                }
                // Log other stream errors
                console.error('❌ OpenAI stream error:', error)
                throw error
              }

              if (abortController.signal.aborted) {
                throw new Error('Stream aborted by user action.')
              }

              const endTime = Date.now()
              console.log('✅ OpenAI request completed:', {
                totalTime: endTime - startTime + 'ms',
                timeToFirstChunk: firstChunkTime - startTime + 'ms',
                totalChunks: chunkCount,
                responseLength: fullResponse.length,
                tokensEstimate: Math.ceil(fullResponse.length / 4) // rough estimate
              })

            } else if (model.startsWith('claude-')) {
              const anthropic = new Anthropic({
                apiKey: config.anthropicApiKey
              })

              
              let maxTokens = 2048 // Default for older models
              if (model === 'claude-sonnet-4-20250514') {
                maxTokens = 4096 // Claude Sonnet 4 can handle up to 64K, but we'll use 4K for reasonable response times
              } else if (model === 'claude-opus-4-20250514') {
                maxTokens = 4096 // Claude Opus 4 can handle up to 32K, but we'll use 4K for reasonable response times
              }

    
              const anthropicMessages = await buildAnthropicMessages(chatMessages, attachments as IncomingAttachment[] | undefined, event)

              const startTime = Date.now()

              const stream = await anthropic.messages.create({
                model,
                max_tokens: maxTokens,
                messages: anthropicMessages,
                system: systemPrompt?.trim() || undefined,
                stream: true
              }, {
                signal: abortController.signal
              })

              const firstChunkTime = Date.now()
              console.log('⚡ First chunk received after:', firstChunkTime - startTime, 'ms')

              let chunkCount = 0
              try {
                for await (const chunk of stream) {
                  chunkCount++
                  
                  if (chunkCount === 1) {
                    console.log('📦 First chunk content:', JSON.stringify(chunk, null, 2))
                  }

                  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                    const content = chunk.delta.text
                    fullResponse += content
                    
                    // Update database in real-time with new content
                    await db.update(messages)
                      .set({ content: fullResponse })
                      .where(eq(messages.id, assistantMessageId))
                    
                    try {
                      // Only send to client if still connected
                      if (!clientDisconnected) {
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
                      }
                    } catch (e) {
                     
                      if ((e as Error)?.message?.includes('closed')) {
                        console.log('🔌 Client stream closed, but continuing Anthropic generation in background')
                        clientDisconnected = true
                      } else {
                        throw e
                      }
                    }
                  }

                  // Log every 50th chunk to avoid spam
                  // if (chunkCount % 50 === 0) {
                  //   console.log(`📊 Processed ${chunkCount} chunks, response length: ${fullResponse.length}`)
                  // }
                }
              } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                  console.log('🛑 Anthropic stream aborted by user.')
                  throw error // Re-throw to be caught by the main handler
                }
                // Log other stream errors
                console.error('❌ Anthropic stream error:', error)
                throw error
              }

              // After the loop, check if the abort was signaled.
              if (abortController.signal.aborted) {
                throw new Error('Stream aborted by user action.')
              }

              const endTime = Date.now()
              // console.log('✅ Anthropic request completed:', {
              //   totalTime: endTime - startTime + 'ms',
              //   timeToFirstChunk: firstChunkTime - startTime + 'ms',
              //   totalChunks: chunkCount,
              //   responseLength: fullResponse.length,
              //   tokensEstimate: Math.ceil(fullResponse.length / 4) // rough estimate
              // })
            } else if (model.startsWith('gemini-')) {
              const apiKey = config.geminiApiKey
              if (!apiKey) {
                throw new Error('Missing Gemini API key')
              }

              let googleMessages = await buildGeminiMessages(chatMessages, attachments as IncomingAttachment[] | undefined, event)

              if (systemPrompt && systemPrompt.trim() !== '') {
                googleMessages.unshift({ role: 'user', parts: [{ text: systemPrompt.trim() }] })
              }

              const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

              const requestBody: any = {
                contents: googleMessages,
                generationConfig: { maxOutputTokens: 2048, temperature: 0.9, topP: 0.95 }
              }

              if (systemPrompt && systemPrompt.trim()) {
                requestBody.systemInstruction = {
                  parts: [{ text: systemPrompt.trim() }]
                }
              }

              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: abortController.signal,
                body: JSON.stringify(requestBody)
              })

              if (!response.ok || !response.body) {
                const errorText = await response.text()
                console.error('❌ Gemini API Error:', response.status, response.statusText, errorText)
                throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
              }

              const reader = response.body.getReader()
              const decoder = new TextDecoder()
              let buffer = ''

              try {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break

                  buffer += decoder.decode(value, { stream: true })
                  
                  // The stream is a single JSON array, delivered in chunks.
                  // We need to find and parse individual JSON objects from the stream.
                  let objStartIndex = buffer.indexOf('{')
                  while (objStartIndex !== -1) {
                    let braceCount = 0
                    let objEndIndex = -1
                    let inString = false
                    
                    for (let i = objStartIndex; i < buffer.length; i++) {
                      if (buffer[i] === '"' && (i === 0 || buffer[i - 1] !== '\\')) {
                        inString = !inString
                      }
                      if (!inString) {
                        if (buffer[i] === '{') braceCount++
                        else if (buffer[i] === '}') braceCount--
                      }
                      
                      if (braceCount === 0) {
                        objEndIndex = i
                        break
                      }
                    }
                    
                    if (objEndIndex !== -1) {
                      const jsonStr = buffer.substring(objStartIndex, objEndIndex + 1)
                      buffer = buffer.substring(objEndIndex + 1) // Remaining buffer
                      
                      try {
                        const data = JSON.parse(jsonStr)
                        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
                        if (text) {
                          fullResponse += text
                          await db.update(messages).set({ content: fullResponse }).where(eq(messages.id, assistantMessageId))
                          if (!clientDisconnected) {
                            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: text })}\n\n`))
                          }
                        }
                      } catch (e) {
                        // This might happen if we grab a partial object. It's noisy but not a fatal error.
                        // The buffer will keep filling until a valid object is parsed.
                      }
                      objStartIndex = buffer.indexOf('{') // Look for the next object
                    } else {
                      // Incomplete object in buffer, break and wait for more data
                      break
                    }
                  }
                }
              } catch (error) {
                if ((error as Error)?.name !== 'AbortError') {
                  console.error('❌ Error reading Gemini stream:', error)
                }
                throw error
              }
            } else {
              const groq = new Groq({
                apiKey: config.groqApiKey
              })

              // Check periodically if client disconnected – the same shared controller is used
              const abortInterval = setInterval(() => {
                if (clientDisconnected) {
                  console.log('🛑 Client disconnected, aborting Groq request')
                  abortController.abort()
                  clearInterval(abortInterval)
                }
              }, 50)

              const stream = await groq.chat.completions.create({
                model,
                messages: chatMessages,
                stream: true
              }, {
                signal: abortController.signal
              }).catch((error) => {
                clearInterval(abortInterval)
                if (error.name === 'AbortError') {
                  console.log('🛑 Groq request aborted successfully')
                  // Re-throw to be caught by the outer handler
                  throw error
                }
                throw error
              })

              clearInterval(abortInterval)
              
              if (!stream) {
                // This case happens if the above .catch threw an AbortError.
                // The outer catch will handle it. We just need to stop processing here.
                console.log('🛑 Groq request was aborted, not processing')
              } else {
                for await (const chunk of stream) {
                  // Check if client aborted
                  if (clientDisconnected && abortController.signal.aborted) {
                    console.log('🛑 Stopping Groq stream due to user abort')
                    break
                  }

                  const content = chunk.choices[0]?.delta?.content || ''
                  if (content) {
                    fullResponse += content
                    try {
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
                    } catch (e) {
                      // Stream might be closed if client disconnected
                      if ((e as Error)?.message?.includes('closed')) {
                        console.log('🛑 Stream closed, stopping Groq processing')
                        break
                      }
                      throw e
                    }
                  }
                }
              }
            }
          } catch (error) {
            if ((error instanceof Error && error.message.includes('aborted')) || (error instanceof Error && error.name === 'AbortError')) {
              console.log('🛑 Request was aborted by user action.')
              userManuallyAborted = true
            } else {
              // Propagate other errors to the outer catch block
              generationFailed = true
              throw error
            }
          }

          if (fullResponse.trim() || userManuallyAborted || generationFailed) {
            await db.update(messages)
              .set({ 
                content: fullResponse,
                status: (userManuallyAborted || generationFailed) ? 'incomplete' : 'complete'
              })
              .where(eq(messages.id, assistantMessageId))

            if (userManuallyAborted) {
              console.log('💾 Saved partial response to database after user abort: ' + fullResponse.length + ' characters')
            } else if (generationFailed) {
              console.log('💾 Generation failed, saved empty placeholder message')
            } else if (clientDisconnected) {
              console.log('💾 Background generation complete. Saved full response to database: ' + fullResponse.length + ' characters')
            } else {
              console.log('💾 Updated complete response in database')
              
              try {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
                  conversationId: currentConversationId,
                  done: true 
                })}\n\n`))
              } catch (e) {
                console.log('🛑 Stream closed while sending completion signal')
              }
            }
          } else {
            if (generationFailed) {
              // Keep the message record but mark incomplete so polling stops
              await db.update(messages).set({ status: 'incomplete' }).where(eq(messages.id, assistantMessageId))
              console.log('🛑 Generation failed, saved empty placeholder message')
            } else {
              // Delete the empty message if truly nothing happened
              await db.delete(messages).where(eq(messages.id, assistantMessageId))
              console.log('🛑 Deleted empty message (no content generated)')
            }
          }
          
        } catch (error) {
          console.error('❌ Chat error details:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            model,
            messageCount: chatMessages.length,
            timestamp: new Date().toISOString()
          })

          // Mark message as incomplete in DB on failure
          if (assistantMessageId) {
            try {
              await db.update(messages)
                .set({ status: 'incomplete' })
                .where(eq(messages.id, assistantMessageId))
              console.log(`💾 Marked message ${assistantMessageId} as incomplete due to generation error.`)
            } catch (dbError) {
              console.error('❌ Failed to update message status on error:', dbError)
            }
          }

          // Only enqueue error if client is still connected
          if (!clientDisconnected) {
            try {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
                error: 'Failed to generate response',
                done: true // Signal to frontend that the stream is over
              })}\n\n`))
            } catch (e) {
              console.log('🔌 Client stream closed, could not send error message.')
            }
          }
        } finally {
          if (assistantMessageId) {
            removeAbortController(assistantMessageId)
          }
          controller.close()

          event.node.req.removeListener('close', handleReqClose)
          event.node.req.removeListener('aborted', handleReqAborted)
          event.node.req.removeListener('error', handleReqError)
          event.node.res.removeListener('close', handleResClose)
        }
      }
    })

    return new Response(stream)

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid input data'
      })
    }
    throw error
  }
})