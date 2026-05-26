import { NextRequest } from 'next/server'

interface RateLimitStore {
  timestamps: number[]
}

// Memory fallback store for local development if Upstash is not configured
const memoryStore = new Map<string, RateLimitStore>()

// Helper to get client IP safely
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const firstIp = xff.split(',')[0]
    if (firstIp) {
      return firstIp.trim()
    }
  }
  return '127.0.0.1'
}

interface RateLimitOptions {
  limit: number
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: Date
}

// In-memory sliding window implementation for fallback
function checkMemoryRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowStart = now - options.windowMs

  let record = memoryStore.get(key)
  if (!record) {
    record = { timestamps: [] }
    memoryStore.set(key, record)
  }

  // Filter out expired timestamps
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart)

  const currentCount = record.timestamps.length

  if (currentCount >= options.limit) {
    const oldestTimestamp = record.timestamps[0] || now
    const resetTime = oldestTimestamp + options.windowMs
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: new Date(resetTime)
    }
  }

  record.timestamps.push(now)
  const remaining = options.limit - record.timestamps.length

  return {
    success: true,
    limit: options.limit,
    remaining,
    reset: new Date(now + options.windowMs)
  }
}

// Upstash Redis pipeline rate limiting
async function checkRedisRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    return null
  }

  const now = Date.now()
  const windowStart = now - options.windowMs
  const expireSec = Math.ceil(options.windowMs / 1000)

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        ['ZADD', key, now, String(now)],
        ['ZREMRANGEBYSCORE', key, 0, windowStart],
        ['ZCARD', key],
        ['EXPIRE', key, expireSec]
      ]),
      // Short timeout to avoid blocking requests if Upstash is slow/down
      signal: AbortSignal.timeout(3000)
    })

    if (!response.ok) {
      console.warn(`[RateLimit] Upstash Redis returned status ${response.status}`)
      return null
    }

    const results = await response.json()
    // Pipeline responses look like: [ { result: 1 }, { result: 0 }, { result: 5 }, { result: 1 } ]
    const zcardResult = results[2]
    if (!zcardResult || typeof zcardResult.result !== 'number') {
      console.warn('[RateLimit] Upstash pipeline output format invalid:', results)
      return null
    }

    const currentCount = zcardResult.result

    if (currentCount > options.limit) {
      return {
        success: false,
        limit: options.limit,
        remaining: 0,
        reset: new Date(now + options.windowMs)
      }
    }

    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - currentCount,
      reset: new Date(now + options.windowMs)
    }
  } catch (error) {
    console.error('[RateLimit] Redis call failed, falling back to memory:', error)
    return null
  }
}

/**
 * Checks the rate limit for a specific IP.
 */
export async function checkRateLimit(
  ip: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const key = `ratelimit:ip:${ip}`

  const redisResult = await checkRedisRateLimit(key, options)
  if (redisResult !== null) {
    return redisResult
  }

  // Fallback to in-memory store
  return checkMemoryRateLimit(key, options)
}

/**
 * Checks the rate limit for a specific User ID.
 */
export async function checkRateLimitByUser(
  userId: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const key = `ratelimit:user:${userId}`

  const redisResult = await checkRedisRateLimit(key, options)
  if (redisResult !== null) {
    return redisResult
  }

  // Fallback to in-memory store
  return checkMemoryRateLimit(key, options)
}
