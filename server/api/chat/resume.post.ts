import { eq, asc, and } from 'drizzle-orm'
import { z } from 'zod'
import OpenAI from 'openai'
import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '~/server/db'
import { messages } from '~/server/db/schema'
import { requireUser, getOwnedConversation } from '~/server/utils/auth'
import { resolveProvider } from '~/server/utils/modelRouter'
import { DEFAULT_MODEL_ID } from '~/lib/models/registry'

const resumeSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  model: z.string().min(1).default(DEFAULT_MODEL_ID),
})

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Merge consecutive same-role messages. Providers like Anthropic and Gemini
// require strictly alternating roles, and our continuation prompt appends a
// user message right after the user's original prompt.
function coalesceRoles(msgs: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = []
  for (const m of msgs) {
    const last = out[out.length - 1]
    if (last && last.role === m.role) {
      last.content += '\n\n' + m.content
    } else {
      out.push({ ...m })
    }
  }
  return out
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const user = await requireUser(event)

    const body = await readBody(event)
    const { messageId, conversationId, model } = resumeSchema.parse(body)

    // Reject unknown models before doing any work or opening a stream.
    const resolved = resolveProvider(model)

    // Ownership: the conversation must belong to the authenticated user.
    await getOwnedConversation(conversationId, user.id)

    // The message must exist, be incomplete, and belong to this conversation.
    const incompleteRows = await db.select().from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)))
      .limit(1)

    if (!incompleteRows.length || incompleteRows[0].status !== 'incomplete') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Message not found or not resumable'
      })
    }
    const incompleteMessage = incompleteRows[0]

    // Conversation history up to (but not including) the incomplete message.
    const history = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))

    const incompleteIndex = history.findIndex(msg => msg.id === messageId)
    if (incompleteIndex === -1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Message not found in conversation'
      })
    }

    const baseMessages: ChatMessage[] = history.slice(0, incompleteIndex).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    // Ask the model to continue from where the partial response stopped.
    const partialContent = incompleteMessage.content
    const lastSentence = partialContent.split(/[.!?]/).pop()?.trim() || ''
    baseMessages.push({
      role: 'user',
      content: `Please continue your previous response exactly where you left off. Your response was cut off mid-way at: "${lastSentence}". Continue from exactly where you stopped, without repeating what you already wrote. Continue seamlessly as if you never stopped.`
    })

    const chatMessages = coalesceRoles(baseMessages)

    // Mark the message as streaming again.
    await db.update(messages)
      .set({ status: 'streaming' })
      .where(eq(messages.id, messageId))

    console.log('🔄 Resuming generation for message:', messageId, 'via', resolved.provider, 'from', partialContent.length, 'characters')

    setHeader(event, 'Content-Type', 'text/stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')

    let isAborted = false
    event.node.req.on('close', () => { isAborted = true })
    event.node.req.on('aborted', () => { isAborted = true })

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = incompleteMessage.content // Start with existing content

        const pushContent = (text: string) => {
          if (!text) return
          fullResponse += text
          if (isAborted) return
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: text })}\n\n`))
          } catch (e) {
            if ((e as Error)?.message?.includes('closed')) {
              isAborted = true
            } else {
              throw e
            }
          }
        }

        if (isAborted) {
          controller.close()
          return
        }

        const abortController = new AbortController()
        const abortInterval = setInterval(() => {
          if (isAborted) {
            abortController.abort()
            clearInterval(abortInterval)
          }
        }, 50)

        try {
          if (resolved.provider === 'openai') {
            const openai = new OpenAI({ apiKey: config.openaiApiKey })
            const completion = await openai.chat.completions.create({
              model: resolved.apiModel,
              messages: chatMessages as any,
              stream: true
            }, { signal: abortController.signal })
            for await (const chunk of completion) {
              if (isAborted) break
              pushContent(chunk.choices[0]?.delta?.content || '')
            }

          } else if (resolved.provider === 'openrouter') {
            const orApiKey = config.openrouterApiKey
            if (!orApiKey) throw new Error('OpenRouter API key not configured. Set OPENROUTER_API_KEY in your environment.')
            const openrouter = new OpenAI({ apiKey: orApiKey, baseURL: 'https://openrouter.ai/api/v1' })
            const completion = await openrouter.chat.completions.create({
              model: resolved.apiModel,
              messages: chatMessages as any,
              stream: true
            }, { signal: abortController.signal })
            for await (const chunk of completion) {
              if (isAborted) break
              pushContent(chunk.choices[0]?.delta?.content || '')
            }

          } else if (resolved.provider === 'groq') {
            const groq = new Groq({ apiKey: config.groqApiKey })
            const completion = await groq.chat.completions.create({
              model: resolved.apiModel,
              messages: chatMessages as any,
              stream: true
            }, { signal: abortController.signal })
            for await (const chunk of completion) {
              if (isAborted) break
              pushContent(chunk.choices[0]?.delta?.content || '')
            }

          } else if (resolved.provider === 'anthropic') {
            const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
            const completion = await anthropic.messages.create({
              model: resolved.apiModel,
              max_tokens: 4096,
              messages: chatMessages as any,
              stream: true
            }, { signal: abortController.signal })
            for await (const chunk of completion) {
              if (isAborted) break
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                pushContent(chunk.delta.text)
              }
            }

          } else if (resolved.provider === 'google') {
            const apiKey = config.geminiApiKey
            if (!apiKey) throw new Error('Missing Gemini API key')

            const contents = chatMessages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }))

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolved.apiModel}:streamGenerateContent?key=${apiKey}`
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: abortController.signal,
              body: JSON.stringify({
                contents,
                generationConfig: { maxOutputTokens: 2048, temperature: 0.9, topP: 0.95 }
              })
            })

            if (!response.ok || !response.body) {
              const errorText = await response.text()
              throw new Error(`Gemini API error: ${response.status} ${response.statusText} ${errorText}`)
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
              const { done, value } = await reader.read()
              if (done || isAborted) break
              buffer += decoder.decode(value, { stream: true })

              let objStartIndex = buffer.indexOf('{')
              while (objStartIndex !== -1) {
                let braceCount = 0
                let objEndIndex = -1
                let inString = false
                for (let i = objStartIndex; i < buffer.length; i++) {
                  if (buffer[i] === '"' && (i === 0 || buffer[i - 1] !== '\\')) inString = !inString
                  if (!inString) {
                    if (buffer[i] === '{') braceCount++
                    else if (buffer[i] === '}') braceCount--
                  }
                  if (braceCount === 0) { objEndIndex = i; break }
                }

                if (objEndIndex !== -1) {
                  const jsonStr = buffer.substring(objStartIndex, objEndIndex + 1)
                  buffer = buffer.substring(objEndIndex + 1)
                  try {
                    const data = JSON.parse(jsonStr)
                    pushContent(data?.candidates?.[0]?.content?.parts?.[0]?.text || '')
                  } catch {
                    // Partial object; wait for more data.
                  }
                  objStartIndex = buffer.indexOf('{')
                } else {
                  break
                }
              }
            }
          }

          clearInterval(abortInterval)

          await db.update(messages)
            .set({
              content: fullResponse,
              status: isAborted ? 'incomplete' : 'complete'
            })
            .where(eq(messages.id, messageId))

          if (!isAborted) {
            try {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ conversationId, done: true })}\n\n`))
            } catch {
              // client gone
            }
          }

        } catch (error) {
          clearInterval(abortInterval)

          const aborted = isAborted || (error instanceof Error && error.name === 'AbortError')
          if (aborted) {
            await db.update(messages)
              .set({ content: fullResponse, status: 'incomplete' })
              .where(eq(messages.id, messageId))
          } else {
            console.error('❌ Resume error:', error)
            await db.update(messages)
              .set({ content: fullResponse, status: 'error' })
              .where(eq(messages.id, messageId))
            try {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Failed to resume generation' })}\n\n`))
            } catch {
              // client gone
            }
          }
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
