import { eq } from 'drizzle-orm'
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

  const messageId = getRouterParam(event, 'id')
  if (!messageId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message ID required'
    })
  }

  const message = await db.select().from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!message.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Message not found'
    })
  }

  return {
    content: message[0].content,
    status: message[0].status,
    lastUpdated: message[0].createdAt
  }
}) 