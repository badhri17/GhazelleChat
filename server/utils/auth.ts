import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { db } from '~/server/db'
import { conversations, messages } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'
import type { Conversation, Message } from '~/server/db/schema'

/**
 * Validates the Lucia session cookie and returns the authenticated user.
 * Throws 401 when no valid session is present.
 */
export async function requireUser(event: H3Event) {
  const sessionId = getCookie(event, lucia.sessionCookieName)
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { session, user } = await lucia.validateSession(sessionId)
  if (!session || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  return user
}

/**
 * Returns the conversation only if it belongs to the given user.
 * Throws 404 when it is missing or owned by someone else.
 */
export async function getOwnedConversation(conversationId: string, userId: string): Promise<Conversation> {
  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1)

  if (!rows.length) {
    throw createError({ statusCode: 404, statusMessage: 'Conversation not found' })
  }

  return rows[0]
}

/**
 * Returns the message only if it belongs to a conversation owned by the given
 * user. Joins through conversations to enforce ownership. Throws 404 otherwise.
 */
export async function getOwnedMessage(messageId: string, userId: string): Promise<Message> {
  const rows = await db
    .select({ message: messages })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(eq(messages.id, messageId), eq(conversations.userId, userId)))
    .limit(1)

  if (!rows.length) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  }

  return rows[0].message
}
