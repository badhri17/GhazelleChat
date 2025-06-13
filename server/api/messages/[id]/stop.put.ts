import { db } from '~/server/db'
import { messages } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { abortMessage } from '~/server/utils/abortControllers'

export default defineEventHandler(async (event) => {
  try {
    const messageId = getRouterParam(event, 'id')
    
    if (!messageId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Message ID is required'
      })
    }

    // Abort the actual request!
    const aborted = abortMessage(messageId)
    console.log('🛑 Abort result for', messageId, ':', aborted)

    // Update message status to incomplete
    await db.update(messages)
      .set({ status: 'incomplete' })
      .where(eq(messages.id, messageId))

    return { success: true }
  } catch (error) {
    console.error('❌ Error stopping message:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to stop message'
    })
  }
}) 