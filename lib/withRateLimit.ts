// lib/withRateLimit.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { rateLimit } from "./rateLimit";

/**
 * withRateLimit - helper to wrap API handlers
 *
 * options:
 *  - keyPrefix: string (defaults to route path)
 *  - limit: number
 *  - windowSeconds: number
 *  - getKey: optional function (req) => string to derive unique key (ip, user, apiKey)
 */
export function withRateLimit(
  handler: NextApiHandler,
  {
    keyPrefix,
    limit = 60,
    windowSeconds = 60,
    getKey,
  }: {
    keyPrefix?: string;
    limit?: number;
    windowSeconds?: number;
    getKey?: (req: NextApiRequest) => string;
  } = {}
): NextApiHandler {
  return async (req, res) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")?.[0]?.trim() || req.socket.remoteAddress || "unknown";
      const base = keyPrefix || req.url || "api";
      const identity = getKey ? getKey(req) : ip;
      const key = `${base}:rl:${identity}`;

      const { allowed, remaining, reset, count } = await rateLimit(key, limit, windowSeconds);

      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(reset));

      if (!allowed) {
        res.status(429).json({
          error: "Too Many Requests",
          message: `Rate limit exceeded. Try again in ${Math.max(0, reset - Math.floor(Date.now() / 1000))}s`,
          limit,
          remaining,
          reset,
        });
        return;
      }

      // attach rate info for handlers if they want it
      (req as any).rate = { limit, remaining, reset, count };

      return handler(req, res);
    } catch (err) {
      console.error("Rate limit error:", err);
      // if Redis error, be lenient and allow request through (prevents total outage)
      return handler(req, res);
    }
  };
}
