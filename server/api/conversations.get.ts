import { eq, desc } from 'drizzle-orm'
import { db } from '~/server/db'
import { conversations } from '~/server/db/schema'
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

  const userConversations = await db.select({
    id: conversations.id,
    title: conversations.title,
    createdAt: conversations.createdAt,
    updatedAt: conversations.updatedAt
  }).from(conversations)
    .where(eq(conversations.userId, user.id))
    .orderBy(desc(conversations.updatedAt))

  return {
    conversations: userConversations
  }
}) 