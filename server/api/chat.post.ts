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
  conversationId: z.string().optional(),
  model: z.enum(['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-latest', 'llama-3.1-70b-versatile']).default('gpt-4o-mini')
})

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default defineEventHandler(async (event) => {
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
            // OpenAI
            const openai = new OpenAI({
              apiKey: process.env.OPENAI_API_KEY
            })

            const stream = await openai.chat.completions.create({
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
          } else if (model.startsWith('claude-')) {
            // Anthropic
            const anthropic = new Anthropic({
              apiKey: process.env.ANTHROPIC_API_KEY
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
          } else {
            // Groq
            const groq = new Groq({
              apiKey: process.env.GROQ_API_KEY
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
          console.error('Chat error:', error)
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