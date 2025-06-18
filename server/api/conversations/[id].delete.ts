import { eq, and } from 'drizzle-orm'
import { db } from '~/server/db'
import { conversations } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'

export default defineEventHandler(async (event) => {
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
      statusMessage: 'Conversation ID is required'
    })
  }
  await db.delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)))

  console.log('🗑️ Conversation deleted:', conversationId)
  return { success: true }
}) 