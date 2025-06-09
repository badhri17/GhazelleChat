import { eq, asc } from 'drizzle-orm'
import { db } from '~/server/db'
import { messages } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'

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

  const conversationMessages = await db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))

  return {
    messages: conversationMessages
  }
}) 