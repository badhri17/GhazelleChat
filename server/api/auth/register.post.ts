import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'
import { enforceRateLimit, getClientIp } from '~/server/utils/rateLimit'
import { BCRYPT_ROUNDS } from '~/server/utils/security'

const registerSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1, 'Full name is required'),
  password: z.string().min(6)
})

export default defineEventHandler(async (event) => {
  enforceRateLimit(`register:${getClientIp(event)}`, 3, 60_000)

  try {
    const body = await readBody(event)
    const { email, fullName, password } = registerSchema.parse(body)
    const normalizedEmail = email.trim().toLowerCase()

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)

    if (existingUser.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User already exists'
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // Create user
    const userId = nanoid()
    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      fullName,
      hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    // Create session
    const session = await lucia.createSession(userId, {})
    appendHeader(event, 'Set-Cookie', lucia.createSessionCookie(session.id).serialize())

    return {
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        fullName
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid input data'
      })
    }
    throw error
  }
}) 