// ─── In-memory rate limiter (no Redis required) ──────────────────────────────
// Sliding window counter per IP.

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

// Auto-cleanup stale entries every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, win] of store.entries()) {
      if (now > win.resetAt) store.delete(key)
    }
  }, 10 * 60 * 1000)
}

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number
  /** Window duration in milliseconds (default: 60 000 = 1 min) */
  windowMs?: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given identifier (usually IP).
 * Call this at the top of an API route before doing heavy work.
 *
 * @example
 * const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
 * const { allowed } = checkRateLimit(`generate:${ip}`, { limit: 20 })
 * if (!allowed) return tooManyRequests('Quá nhiều yêu cầu. Thử lại sau 1 phút.')
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs = 60_000 }: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || now > existing.resetAt) {
    // Start a new window
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  existing.count += 1
  const allowed = existing.count <= limit
  return { allowed, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt }
}
