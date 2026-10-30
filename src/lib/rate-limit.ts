export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  size(): number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 5_000;

/**
 * Fixed-window, in-memory limiter. Enough for a single-instance MVP.
 * On serverless/multi-instance deploys each instance has its own counters,
 * so swap this for a shared store (Redis/Upstash) before launch.
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const now = config.now ?? Date.now;
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string): RateLimitResult {
      const timestamp = now();

      if (buckets.size > MAX_TRACKED_KEYS) {
        for (const [bucketKey, bucket] of buckets) {
          if (bucket.resetAt <= timestamp) buckets.delete(bucketKey);
        }
      }

      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= timestamp) {
        bucket = { count: 0, resetAt: timestamp + config.windowMs };
        buckets.set(key, bucket);
      }

      bucket.count += 1;
      const remaining = Math.max(0, config.limit - bucket.count);

      return {
        allowed: bucket.count <= config.limit,
        limit: config.limit,
        remaining,
        resetAt: bucket.resetAt,
        retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000)),
      };
    },

    size(): number {
      return buckets.size;
    },
  };
}

/**
 * Best-effort client IP.
 *
 * `x-forwarded-for` is only trustworthy behind a proxy that overwrites it.
 * Behind Vercel/a load balancer this is fine; on a raw public server, treat
 * the result as a hint rather than a security boundary.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}
