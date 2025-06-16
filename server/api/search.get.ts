import { createClient } from '@libsql/client'
import { lucia } from '~/server/plugins/lucia'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string | undefined)?.trim()

  if (!q) {
    return { conversations: [] }
  }

  // Validate session
  const sessionId = getCookie(event, lucia.sessionCookieName)
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const { session, user } = await lucia.validateSession(sessionId)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  // Prepare client (could reuse existing but easy to create new)
  const client = createClient({ url: process.env.DATABASE_URL || 'file:./db.sqlite' })

  const sql = `
    SELECT DISTINCT c.id, c.title, c.created_at AS createdAt, c.updated_at AS updatedAt
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
    WHERE c.user_id = ?
      AND (
        LOWER(c.title) LIKE LOWER(?) OR
        LOWER(m.content) LIKE LOWER(?)
      )
    ORDER BY c.updated_at DESC
    LIMIT 40;
  `

  const pattern = `%${q}%`
  const result = await client.execute({ sql, args: [user.id, pattern, pattern] })

  const conversations = result.rows.map((row: any) => ({
    id: row.id as string,
    title: row.title as string,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
  }))

  return { conversations }
}) 