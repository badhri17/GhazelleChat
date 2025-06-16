import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, lucia.sessionCookieName)
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { session, user } = await lucia.validateSession(sessionId)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  const body = await readBody(event)
  const { oldPassword, newPassword } = z
    .object({
      oldPassword: z.string().min(6),
      newPassword: z.string().min(8),
    })
    .parse(body)

  // Retrieve current hashed password
  const dbUserRes = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (dbUserRes.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  const dbUser = dbUserRes[0]

  const isOldPasswordValid = await bcrypt.compare(oldPassword, dbUser.hashedPassword)
  if (!isOldPasswordValid) {
    throw createError({ statusCode: 400, statusMessage: 'Incorrect current password' })
  }

  const hashed = await bcrypt.hash(newPassword, 10)
  await db.update(users).set({ hashedPassword: hashed, updatedAt: new Date() }).where(eq(users.id, user.id))

  return { success: true }
}) 