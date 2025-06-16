import { eq, asc } from 'drizzle-orm'
import { db } from '~/server/db'
import { messages, attachments } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'
import type { Message, Attachment } from '~/server/db/schema'

interface MessageWithAttachments extends Message {
  attachments: Attachment[]
}

export default defineEventHandler(async (event) => {
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

  const conversationId = getRouterParam(event, 'id')
  if (!conversationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Conversation ID required'
    })
  }

  const results = await db
    .select({
      message: messages,
      attachment: attachments,
    })
    .from(messages)
    .leftJoin(attachments, eq(messages.id, attachments.messageId))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))

  const messageMap = new Map<string, MessageWithAttachments>()

  for (const row of results) {
    const { message, attachment } = row
    if (!messageMap.has(message.id)) {
      messageMap.set(message.id, {
        ...message,
        attachments: [],
      })
    }

    if (attachment) {
      messageMap.get(message.id)!.attachments.push(attachment)
    }
  }

  const conversationMessages = Array.from(messageMap.values())

  return {
    messages: conversationMessages,
  }
}) 