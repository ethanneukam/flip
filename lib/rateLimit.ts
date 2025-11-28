// lib/rateLimit.ts
import { safeIncr, safeTtl } from "./redis";

/**
 * rateLimit - fixed window counter
 *
 * @param key string - unique key (ex: ip:search or user:123:create-listing)
 * @param limit number - allowed requests in window
 * @param windowSeconds number - window size in seconds
 * @returns { allowed: boolean, remaining: number, reset: number }
 */
export async function rateLimit(key: string, limit = 60, windowSeconds = 60) {
  const count = await safeIncr(key, windowSeconds);
  const ttl = await safeTtl(key);

  const remaining = Math.max(0, limit - count);
  const allowed = count <= limit;
  // reset: unix seconds until window reset
  const reset = ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : Math.floor(Date.now() / 1000);

  return { allowed, remaining, reset, count };
}
