import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~/server/db'
import { messages } from '~/server/db/schema'
import { requireUser, getOwnedMessage } from '~/server/utils/auth'

const statusSchema = z.object({
  status: z.enum(['complete', 'incomplete', 'streaming', 'error'])
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const messageId = getRouterParam(event, 'id')
  if (!messageId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message ID required'
    })
  }

  const body = await readBody(event)
  const { status } = statusSchema.parse(body)

  // Ensure the message belongs to the authenticated user before updating.
  await getOwnedMessage(messageId, user.id)

  await db.update(messages)
    .set({ status })
    .where(eq(messages.id, messageId))

  console.log('📝 Updated message status:', messageId, 'to', status)

  return { success: true }
}) 