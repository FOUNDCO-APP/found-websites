import { NextResponse } from "next/server"

type HeaderBag = { get(name: string): string | null }
type HeaderSource = Request | HeaderBag

type Bucket = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  retryAfter: number
  limit: number
  remaining: number
  resetAt: number
}

declare global {
  var __foundPublicRateLimitBuckets: Map<string, Bucket> | undefined
}

const buckets = globalThis.__foundPublicRateLimitBuckets ?? new Map<string, Bucket>()
globalThis.__foundPublicRateLimitBuckets = buckets

function headersFrom(source: HeaderSource): HeaderBag {
  if ("get" in source && typeof source.get === "function") return source
  if ("headers" in source) return source.headers
  return source
}

function firstHeader(headers: HeaderBag, names: string[]) {
  for (const name of names) {
    const value = headers.get(name)
    if (value) return value
  }
  return ""
}

export function clientIp(source: HeaderSource) {
  const headers = headersFrom(source)
  const raw = firstHeader(headers, ["x-forwarded-for", "x-real-ip", "true-client-ip", "cf-connecting-ip"])
  const first = raw.split(",")[0]?.trim()
  return first || "unknown"
}

function cleanup(now: number) {
  if (buckets.size < 1000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function checkPublicRateLimit(source: HeaderSource, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  cleanup(now)
  const ip = clientIp(source)
  const bucketKey = `${options.key}:${ip}`
  const existing = buckets.get(bucketKey)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs
    buckets.set(bucketKey, { count: 1, resetAt })
    return { allowed: true, retryAfter: 0, limit: options.limit, remaining: options.limit - 1, resetAt }
  }

  if (existing.count >= options.limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    return { allowed: false, retryAfter, limit: options.limit, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return { allowed: true, retryAfter: 0, limit: options.limit, remaining: Math.max(0, options.limit - existing.count), resetAt: existing.resetAt }
}

export function publicRateLimitMessage(result: RateLimitResult) {
  const minutes = Math.max(1, Math.ceil(result.retryAfter / 60))
  return `Too many attempts. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: publicRateLimitMessage(result) },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  )
}