import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

let upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!upstashLimiter) {
    const redis = new Redis({ url, token });
    upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS, "15 m"),
      prefix: "gomita:login",
    });
  }
  return upstashLimiter;
}

export function loginRateLimitKey(email: string, ip?: string | null): string {
  const normalized = email.trim().toLowerCase();
  return ip ? `ip:${ip}:${normalized}` : `email:${normalized}`;
}

/**
 * Call once per sign-in attempt (before password verification).
 */
export async function consumeLoginAttempt(
  key: string,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const limiter = getUpstashLimiter();
  if (limiter) {
    const result = await limiter.limit(key);
    if (!result.success) {
      const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
      return { ok: false, retryAfterSec };
    }
    return { ok: true };
  }

  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  bucket.count += 1;
  return { ok: true };
}

export function resetLoginAttempts(key: string): void {
  memoryBuckets.delete(key);
}
