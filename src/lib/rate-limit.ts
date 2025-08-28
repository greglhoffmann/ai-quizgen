/**
 * Rate limiter
 * - Simple per-IP window counter; Redis-backed when available, else in-memory.
 * - Usage: const { allowed, remaining, reset } = await rateLimit(ip, 'genquiz', 20, 60);
 */

let redis: any = null as any;
const useRedis = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

if (useRedis) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch {
    // fall back to memory
  }
}

const mem = new Map<string, { count: number; reset: number }>();
const PREFIX = 'aqg:rl:';

export async function rateLimit(
  ip: string,
  bucket: string,
  max: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const now = Math.floor(Date.now() / 1000);
  const key = `${PREFIX}${bucket}:${ip || 'unknown'}`;

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      const ttl = await redis.ttl(key);
      const remaining = Math.max(0, max - count);
      const allowed = count <= max;
      const reset = now + Math.max(0, ttl ?? windowSeconds);
      return { allowed, remaining, reset };
    } catch {
      // fall through to memory
    }
  }

  const current = mem.get(key);
  if (!current || current.reset <= now) {
    const reset = now + windowSeconds;
    mem.set(key, { count: 1, reset });
    return { allowed: true, remaining: Math.max(0, max - 1), reset };
  }
  current.count += 1;
  mem.set(key, current);
  const allowed = current.count <= max;
  return { allowed, remaining: Math.max(0, max - current.count), reset: current.reset };
}
