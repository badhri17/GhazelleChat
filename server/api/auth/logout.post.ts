import { lucia } from '~/server/plugins/lucia'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, lucia.sessionCookieName)
  
  if (!sessionId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  await lucia.invalidateSession(sessionId)
  appendHeader(event, 'Set-Cookie', lucia.createBlankSessionCookie().serialize())

  return {
    success: true
  }
}) 