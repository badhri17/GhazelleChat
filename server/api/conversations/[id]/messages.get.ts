import { eq, asc } from 'drizzle-orm'
import { db } from '~/server/db'
import { messages, attachments } from '~/server/db/schema'
import { requireUser, getOwnedConversation } from '~/server/utils/auth'
import type { Message, Attachment } from '~/server/db/schema'

interface MessageWithAttachments extends Message {
  attachments: Attachment[]
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const conversationId = getRouterParam(event, 'id')
  if (!conversationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Conversation ID required'
    })
  }

  // Ensure the conversation belongs to the authenticated user.
  await getOwnedConversation(conversationId, user.id)

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