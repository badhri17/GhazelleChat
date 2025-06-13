import { eq, asc } from 'drizzle-orm'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import OpenAI from 'openai'
import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '~/server/db'
import { conversations, messages } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'

const resumeSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  model: z.enum([
    'gpt-4o',
    'gpt-4o-mini',
    'claude-3-5-sonnet-latest',
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
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
    const { messageId, conversationId, model } = resumeSchema.parse(body)

    // Verify the message exists and is incomplete
    const incompleteMessage = await db.select().from(messages)
      .where(eq(messages.id, messageId))
      .limit(1)

    if (!incompleteMessage.length || incompleteMessage[0].status !== 'incomplete') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Message not found or not resumable'
      })
    }

    // Get conversation history up to this message
    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))

    // Find the incomplete message index
    const incompleteIndex = history.findIndex(msg => msg.id === messageId)
    if (incompleteIndex === -1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Message not found in conversation'
      })
    }

    // Use conversation history up to (but not including) the incomplete message
    const chatMessages: ChatMessage[] = history.slice(0, incompleteIndex).map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    // Create a continuation prompt that asks the LLM to continue from the partial content
    const partialContent = incompleteMessage[0].content
    const lastSentence = partialContent.split(/[.!?]/).pop()?.trim() || ''
    
    // Add a special continuation message
    chatMessages.push({
      role: 'user',
      content: `Please continue your previous response exactly where you left off. Your response was cut off mid-way at: "${lastSentence}". Continue from exactly where you stopped, without repeating what you already wrote. Continue seamlessly as if you never stopped.`
    })

    // Update message status to streaming
    await db.update(messages)
      .set({ status: 'streaming' })
      .where(eq(messages.id, messageId))

    console.log('🔄 Resuming generation for message:', messageId, 'from', partialContent.length, 'characters')

    // Set up streaming response (same as original chat endpoint)
    setHeader(event, 'Content-Type', 'text/stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')

    // Check if client disconnected
    let isAborted = false
    
    event.node.req.on('close', () => {
      if (!isAborted) {
        isAborted = true
        console.log('🛑 Client disconnected during resume')
      }
    })
    
    event.node.req.on('aborted', () => {
      if (!isAborted) {
        isAborted = true
        console.log('🛑 Resume request aborted by client')
      }
    })

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = incompleteMessage[0].content // Start with existing content

        if (isAborted) {
          console.log('🛑 Connection lost before resume, aborting')
          controller.close()
          return
        }

        try {
          // Continue generation based on model type
          if (model.startsWith('gpt-')) {
            const openai = new OpenAI({
              apiKey: config.openaiApiKey
            })

            console.log('🔄 Resuming OpenAI generation from:', fullResponse.length + ' characters')

            const openaiAbortController = new AbortController()
            
            const abortInterval = setInterval(() => {
              if (isAborted) {
                console.log('🛑 Aborting resumed OpenAI request')
                openaiAbortController.abort()
                clearInterval(abortInterval)
              }
            }, 50)

            const stream = await openai.chat.completions.create({
              model,
              messages: chatMessages,
              stream: true
            }, {
              signal: openaiAbortController.signal
            }).catch((error) => {
              clearInterval(abortInterval)
              if (error.name === 'AbortError') {
                console.log('🛑 Resumed OpenAI request aborted')
                return null
              }
              throw error
            })

            clearInterval(abortInterval)
            
            if (!stream) {
              console.log('🛑 Resumed OpenAI request was aborted')
              return
            }

            for await (const chunk of stream) {
              if (isAborted) {
                console.log('🛑 Stopping resumed OpenAI stream')
                break
              }

              const content = chunk.choices[0]?.delta?.content || ''
              
              if (content) {
                fullResponse += content
                try {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
                } catch (e) {
                  if ((e as Error)?.message?.includes('closed')) {
                    console.log('🛑 Stream closed during resume')
                    break
                  }
                  throw e
                }
              }
            }

          } else if (model.startsWith('claude-')) {
            // Similar implementation for Claude...
            console.log('🔄 Claude resume not yet implemented')
          } else if (model.startsWith('gemini-')) {
            // Similar implementation for Gemini...
            console.log('🔄 Gemini resume not yet implemented')
          } else {
            // Similar implementation for Groq...
            console.log('🔄 Groq resume not yet implemented')
          }

          // Update the message with final content and status
          if (fullResponse.trim()) {
            await db.update(messages)
              .set({ 
                content: fullResponse,
                status: isAborted ? 'incomplete' : 'complete'
              })
              .where(eq(messages.id, messageId))

            if (isAborted) {
              console.log('💾 Updated resumed partial response:', fullResponse.length + ' characters')
            } else {
              console.log('💾 Completed resumed generation')
              
              try {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
                  conversationId,
                  done: true 
                })}\n\n`))
              } catch (e) {
                console.log('🛑 Stream closed while sending completion')
              }
            }
          }
          
        } catch (error) {
          console.error('❌ Resume error:', error)
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ 
            error: 'Failed to resume generation' 
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