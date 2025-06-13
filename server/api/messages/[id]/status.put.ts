import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~/server/db'
import { messages } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'

const statusSchema = z.object({
  status: z.enum(['complete', 'incomplete', 'streaming'])
})

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

  const body = await readBody(event)
  const { status } = statusSchema.parse(body)

  // Update message status
  await db.update(messages)
    .set({ status })
    .where(eq(messages.id, messageId))

  console.log('📝 Updated message status:', messageId, 'to', status)

  return { success: true }
}) 