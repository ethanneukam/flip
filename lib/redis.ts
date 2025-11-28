// lib/redis.ts
import IORedis from "ioredis";

let redis: IORedis.Redis | null = null;
let ready = false;
let fallbackStore = new Map<string, { count: number; expiresAt: number }>();

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || "";

if (REDIS_URL) {
  try {
    redis = new IORedis(REDIS_URL, {
      // optional: tune timeouts
      connectTimeout: 5000,
      lazyConnect: false,
    });

    redis.on("connect", () => {
      ready = true;
      console.log("Redis connected");
    });
    redis.on("error", (err) => {
      ready = false;
      console.warn("Redis error:", err?.message || err);
    });
  } catch (e) {
    console.warn("Redis init failed, falling back to memory:", (e as Error).message);
    redis = null;
    ready = false;
  }
} else {
  console.warn("No REDIS_URL provided — using in-memory fallback for rate limiting.");
}

/**
 * Safe Redis wrapper functions used by rate limiter.
 */
export async function safeIncr(key: string, ttlSeconds: number) {
  if (redis && ready) {
    // INCR and set expiry if new
    const val = await redis.incr(key);
    if (val === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return Number(val);
  }

  // fallback in-memory fixed window
  const now = Date.now();
  const cur = fallbackStore.get(key);
  if (!cur || cur.expiresAt < now) {
    fallbackStore.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
    return 1;
  }
  cur.count += 1;
  fallbackStore.set(key, cur);
  return cur.count;
}

export async function safeTtl(key: string) {
  if (redis && ready) {
    const ttl = await redis.ttl(key);
    return ttl;
  }
  const now = Date.now();
  const cur = fallbackStore.get(key);
  if (!cur) return -2; // consistent with Redis -2 (key does not exist)
  const msLeft = Math.max(0, cur.expiresAt - now);
  return Math.ceil(msLeft / 1000);
}

export async function safeSet(key: string, value: string, ttlSeconds?: number) {
  if (redis && ready) {
    if (ttlSeconds) return redis.set(key, value, "EX", ttlSeconds);
    return redis.set(key, value);
  }
  const now = Date.now();
  fallbackStore.set(key, { count: Number(value), expiresAt: ttlSeconds ? now + ttlSeconds * 1000 : Infinity });
  return "OK";
}

export async function safeGet(key: string) {
  if (redis && ready) {
    const v = await redis.get(key);
    return v;
  }
  const cur = fallbackStore.get(key);
  if (!cur) return null;
  return String(cur.count);
}
