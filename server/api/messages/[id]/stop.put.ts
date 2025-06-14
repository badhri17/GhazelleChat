import { z } from 'zod'
import { abortMessage } from '~/server/utils/abortControllers'
import { lucia } from '~/server/plugins/lucia'

export default defineEventHandler(async (event) => {
  // 1. Authenticate the user
  const sessionId = getCookie(event, lucia.sessionCookieName)
  if (!sessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const { session } = await lucia.validateSession(sessionId)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  // 2. Validate the message ID from the URL
  const paramsSchema = z.object({
    id: z.string().min(1)
  })

  const params = await getValidatedRouterParams(event, paramsSchema.parse)
  const messageId = params.id

  // 3. Attempt to abort the message generation
  const aborted = abortMessage(messageId)

  if (aborted) {
    console.log('✅ Successfully aborted request for message:', messageId)
    return { success: true, message: 'Generation stopped.' }
  } else {
    console.log('⚠️ Could not abort request for message (already completed or not found):', messageId)
    throw createError({
      statusCode: 404,
      statusMessage: 'Could not stop generation. It may have already completed.'
    })
  }
}) 