import { requireUser, getOwnedMessage } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const messageId = getRouterParam(event, 'id')
  if (!messageId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message ID required'
    })
  }

  const message = await getOwnedMessage(messageId, user.id)

  return {
    content: message.content,
    status: message.status,
    lastUpdated: message.createdAt
  }
}) 