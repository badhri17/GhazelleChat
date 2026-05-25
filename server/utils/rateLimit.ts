import type { H3Event } from 'h3'

// In-memory fixed-window rate limiter. Adequate for a single-instance,
// self-hosted deployment. Multi-instance/serverless deploys should swap this
// for a shared store (Redis, etc.) — see README.
interface WindowState {
  count: number
  resetAt: number
}

const buckets = new Map<string, WindowState>()

/**
 * Throws 429 when `key` has exceeded `limit` requests within `windowMs`.
 * Returns silently otherwise.
 */
export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const state = buckets.get(key)

  if (!state || now >= state.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  state.count++
  if (state.count > limit) {
    const retryAfter = Math.ceil((state.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      data: { retryAfter },
    })
  }
}

/** Resolves a best-effort client identifier (proxied IP, then socket address). */
export function getClientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) || event.node.req.socket.remoteAddress || 'unknown'
}

// Periodically drop expired buckets so the map doesn't grow unbounded.
const CLEANUP_INTERVAL = 5 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [key, state] of buckets) {
    if (now >= state.resetAt) buckets.delete(key)
  }
}, CLEANUP_INTERVAL).unref?.()
