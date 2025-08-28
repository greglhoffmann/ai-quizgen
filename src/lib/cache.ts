/**
 * Cache abstraction
 * - Uses Upstash Redis if configured, otherwise an in-memory Map.
 * - Same API across backends; used for quizzes and Wikipedia assists.
 */

let redis: any = null as any;
const useRedis = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

if (useRedis) {
	try {
		// Lazy import to avoid bundling in edge/client
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { Redis } = require('@upstash/redis');
		redis = new Redis({
			url: process.env.UPSTASH_REDIS_REST_URL,
			token: process.env.UPSTASH_REDIS_REST_TOKEN,
		});
	} catch {
		// If the package is missing, fall back to memory
	}
}

const PREFIX = 'aqg:'; // namespace keys to avoid collisions

// In-memory map fallback (per process)
const mem = new Map<string, { v: unknown; exp: number }>();

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
	const k = PREFIX + key;
	if (redis) {
		try {
			const raw = await redis.get(k);
			if (!raw) return null;
			return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T);
		} catch {
			// fall through to memory
		}
	}
	const e = mem.get(k);
	if (!e) return null;
	if (Date.now() > e.exp) {
		mem.delete(k);
		return null;
	}
	return e.v as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
	const k = PREFIX + key;
	if (redis) {
		try {
			// Upstash supports PX for ms, EX for seconds; here we use EX
			const payload = typeof value === 'string' ? value : JSON.stringify(value);
			await redis.set(k, payload, { ex: ttlSeconds });
			return;
		} catch {
			// fall through to memory
		}
	}
	mem.set(k, { v: value, exp: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
	const k = PREFIX + key;
	if (redis) {
		try {
			await redis.del(k);
			return;
		} catch {
			// fall through
		}
	}
	mem.delete(k);
}

