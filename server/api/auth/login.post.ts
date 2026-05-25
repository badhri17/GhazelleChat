import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'
import { lucia } from '~/server/plugins/lucia'
import { enforceRateLimit, getClientIp } from '~/server/utils/rateLimit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

export default defineEventHandler(async (event) => {
  enforceRateLimit(`login:${getClientIp(event)}`, 5, 60_000)

  try {
    const body = await readBody(event)
    const { email, password } = loginSchema.parse(body)
    const normalizedEmail = email.trim().toLowerCase()

    // Find user by email
    const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)
    
    if (existingUser.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email or password'
      })
    }

    const user = existingUser[0]

    // Verify password
    const validPassword = await bcrypt.compare(password, user.hashedPassword)
    if (!validPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email or password'
      })
    }

    // Create session
    const session = await lucia.createSession(user.id, {})
    appendHeader(event, 'Set-Cookie', lucia.createSessionCookie(session.id).serialize())

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName
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