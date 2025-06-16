import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'

export default defineEventHandler(async (event) => {
  // Validate session
  const sessionId = getCookie(event, lucia.sessionCookieName)
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { session, user } = await lucia.validateSession(sessionId)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  // Validate input
  const body = await readBody(event)
  const { newName } = z
    .object({ newName: z.string().min(1).max(100) })
    .parse(body)

  // Update DB
  await db
    .update(users)
    .set({ fullName: newName, updatedAt: new Date() })
    .where(eq(users.id, user.id))

  // Return success
  return { success: true }
}) 