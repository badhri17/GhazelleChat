import { eq } from 'drizzle-orm'
import { asc } from 'drizzle-orm'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import OpenAI from 'openai'
import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '~/server/db'
import { conversations, messages } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().nullable().optional(),
  model: z.enum([
    'gpt-4o',
    'gpt-4o-mini',
    'claude-3-5-sonnet-latest',
    'llama-3.1-70b-versatile',
    'gemini-pro',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite'
  ]).default('gpt-4o-mini')
})

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    // Verify authentication
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
    const { message, conversationId, model } = chatSchema.parse(body)

    let currentConversationId = conversationId

    // Create conversation if it doesn't exist
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

    // Save user message
    const userMessageId = nanoid()
    await db.insert(messages).values({
      id: userMessageId,
      conversationId: currentConversationId,
      role: 'user',
      content: message,
      createdAt: new Date()
    })

    // Get conversation history
    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, currentConversationId))
      .orderBy(asc(messages.createdAt))

    const chatMessages: ChatMessage[] = history.map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    // Set up streaming response
    setHeader(event, 'Content-Type', 'text/stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''

        try {
          if (model.startsWith('gpt-')) {
            const openai = new OpenAI({
              apiKey: config.openaiApiKey
            })

            // Log the request payload
            const requestPayload = {
              model,
              messages: chatMessages,
              stream: true
            }
            console.log('🚀 OpenAI API Request:', {
              url: 'https://api.openai.com/v1/chat/completions',
              method: 'POST',
              model,
              messageCount: chatMessages.length,
              messages: chatMessages.map(msg => ({ role: msg.role, content: msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : '') })),
            })

            const startTime = Date.now()
            console.log('⏱️ Starting OpenAI request at:', new Date().toISOString())

            const stream = await openai.chat.completions.create({
              ...requestPayload,
              stream: true
            })

            const firstChunkTime = Date.now()
            console.log('⚡ First chunk received after:', firstChunkTime - startTime, 'ms')

            let chunkCount = 0
            for await (const chunk of stream) {
              chunkCount++
              const content = chunk.choices[0]?.delta?.content || ''
              
              if (chunkCount === 1) {
                console.log('📦 First chunk content:', JSON.stringify(chunk, null, 2))
              }
              
              if (content) {
                fullResponse += content
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
              }

              // Log every 50th chunk to avoid spam
              if (chunkCount % 50 === 0) {
                console.log(`📊 Processed ${chunkCount} chunks, response length: ${fullResponse.length}`)
              }
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

            const stream = await anthropic.messages.create({
              model,
              max_tokens: 2048,
              messages: chatMessages,
              stream: true
            })

            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                const content = chunk.delta.text
                fullResponse += content
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
              }
            }
          } else if (model.startsWith('gemini-')) {
            const apiKey = config.geminiApiKey
            if (!apiKey) {
              throw new Error('Missing Gemini API key')
            }

            // Convert chat history to Gemini format
            const googleMessages = chatMessages.map((msg) => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }]
            }))

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

            console.log('🚀 Gemini API Request:', {
              model,
              messageCount: chatMessages.length,
              url: url.replace(/key=.+/, 'key=***')
            })

            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contents: googleMessages,
                generationConfig: {
                  maxOutputTokens: 2048,
                  temperature: 0.9,
                  topP: 0.95
                }
              })
            })

            if (!response.ok || !response.body) {
              const errorText = await response.text()
              console.error('❌ Gemini API Error:', response.status, response.statusText, errorText)
              throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })

              // Parse comma-separated JSON objects
              // Remove array brackets if present
              let cleanBuffer = buffer.replace(/^\[/, '').replace(/\]$/, '')
              
              // Try to find complete JSON objects separated by commas
              const possibleObjects = cleanBuffer.split(/,(?=\s*{)/)
              
              // Keep the last incomplete object in buffer
              if (possibleObjects.length > 1) {
                buffer = possibleObjects.pop() || ''
                
                for (const objStr of possibleObjects) {
                  const trimmedObj = objStr.trim()
                  if (!trimmedObj) continue
                  
                  try {
                    const data = JSON.parse(trimmedObj)
                    console.log('📦 Gemini chunk:', data)
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
                    if (text) {
                      fullResponse += text
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: text })}\n\n`))
                    }
                  } catch (e) {
                    console.warn('⚠️ Failed to parse Gemini chunk:', trimmedObj.slice(0, 100), e)
                  }
                }
              }
            }

            // Parse any remaining buffer content
            if (buffer.trim()) {
              const cleanBuffer = buffer.replace(/^\[/, '').replace(/\]$/, '').trim()
              if (cleanBuffer) {
                try {
                  const data = JSON.parse(cleanBuffer)
                  console.log('📦 Gemini final chunk:', data)
                  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
                  if (text) {
                    fullResponse += text
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: text })}\n\n`))
                  }
                } catch (e) {
                  console.warn('⚠️ Failed to parse final Gemini chunk:', cleanBuffer.slice(0, 100), e)
                }
              }
            }

          } else {
            const groq = new Groq({
              apiKey: config.groqApiKey
            })

            const stream = await groq.chat.completions.create({
              model,
              messages: chatMessages,
              stream: true
            })

            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || ''
              if (content) {
                fullResponse += content
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
              }
            }
          }

          // Save assistant message
          const assistantMessageId = nanoid()
          await db.insert(messages).values({
            id: assistantMessageId,
            conversationId: currentConversationId,
            role: 'assistant',
            content: fullResponse,
            model,
            createdAt: new Date()
          })

          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
            conversationId: currentConversationId,
            done: true 
          })}\n\n`))
          
        } catch (error) {
          console.error('❌ Chat error details:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            model,
            messageCount: chatMessages.length,
            timestamp: new Date().toISOString()
          })
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
            error: 'Failed to generate response' 
          })}\n\n`))
        } finally {
          controller.close()
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