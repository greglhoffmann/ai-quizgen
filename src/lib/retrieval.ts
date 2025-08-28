/**
 * Retrieval helpers (Wikipedia REST)
 *
 * What these do
 * - fetchWikipediaSummary: Returns a short natural-language blurb (summary/description) for a topic.
 * - fetchWikipediaPageInfo: Returns a canonicalized title, a compact extract, and a light type hint
 *   to detect potential ambiguity.
 *
 * Approach
 * - Uses the REST endpoint: https://en.wikipedia.org/api/rest_v1/page/summary/{encodedTitle}
 * - We keep this best-effort and non-blocking: all failures resolve to null so callers can proceed.
 * - Responses are cached with short TTLs to reduce latency and avoid repeated external calls.
 *
 * Notes
 * - We deliberately avoid following redirects or scraping HTML; this should remain low-complexity.
 * - Returned text is truncated to a safe length for prompts and UI tooltips.
 */
import { cacheGet, cacheSet } from './cache';

/**
 * Fetch a human-readable summary for a topic from Wikipedia (best-effort).
 *
 * Contract
 * - Input: raw topic string (user-provided); we encode it for the REST URL.
 * - Output: string summary (<= 1500 chars) or null if unavailable/errors.
 *
 * Behavior
 * 1) Try cache (key: wiki:summary:{lowercased topic}).
 * 2) GET the REST summary endpoint with Accept: application/json.
 * 3) Prefer `extract`; fall back to `description` if missing.
 * 4) Truncate to 1500 chars to keep prompts compact and avoid UI overflow.
 * 5) Cache on success for 24 hours.
 * 6) On any error, return null (callers should treat as optional context).
 */
export async function fetchWikipediaSummary(topic: string): Promise<string | null> {
	try {
		// Cache key: namespace summaries by lowercased topic
		const key = `wiki:summary:${topic.toLowerCase()}`;
		const cached = await cacheGet<string>(key);
		if (cached) return cached;
		// Wikipedia REST summary endpoint; JSON only
		const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
		const res = await fetch(url, { headers: { accept: 'application/json' } });
		if (!res.ok) return null;
		const data = await res.json();
		// Use the summary as-is; disambiguation detection happens in page info helper
		const extract: string | undefined = data?.extract || data?.description;
		const out = extract ? String(extract).slice(0, 1500) : null;
		// Cache successful lookups for ~24h
		if (out) await cacheSet(key, out, 60 * 60 * 24);
		return out;
	} catch {
		// Silent fail-by-null: upstream treats this as optional context
		return null;
	}
}

/**
 * Light classification of the page based on Wikipedia's REST metadata.
 * - 'standard'       → A typical article page.
 * - 'disambiguation' → A disambiguation page (topic has multiple meanings).
 * - 'missing'        → Reserved for future use (not currently emitted by this helper).
 */
export type WikiType = 'standard' | 'disambiguation' | 'missing';

/**
 * Fetch canonical page info for a topic: title, short extract, and type hint.
 *
 * Contract
 * - Input: raw topic string.
 * - Output: { title, extract, type } or null on error.
 *   - title: Wikipedia's canonical title when available; falls back to the input.
 *   - extract: short blurb (<= 800 chars) to seed prompts or UI hints.
 *   - type: 'standard' or 'disambiguation' (see WikiType above).
 *
 * Behavior
 * 1) Try cache (key: wiki:pageinfo:{lowercased topic}).
 * 2) GET the same REST summary endpoint (it includes `type` and `title`).
 * 3) Detect disambiguation via `data.type === 'disambiguation'`.
 * 4) Normalize a concise extract from `extract` or `description`.
 * 5) Cache for 12 hours.
 * 6) Return null on any network/parse error; callers should treat as optional.
 */
export async function fetchWikipediaPageInfo(topic: string): Promise<{ title: string; extract: string | null; type: WikiType } | null> {
	try {
		// Cache key: namespace page info by lowercased topic
		const key = `wiki:pageinfo:${topic.toLowerCase()}`;
		const cached = await cacheGet<{ title: string; extract: string | null; type: WikiType }>(key);
		if (cached) return cached;
		// The summary endpoint includes canonical title and a `type` field we can use
		const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
		const res = await fetch(url, { headers: { accept: 'application/json' } });
		if (!res.ok) return null;
		const data = await res.json();
		// Map REST `type` to our light classifier
		const type: WikiType = data?.type === 'disambiguation' ? 'disambiguation' : 'standard';
		// Use Wikipedia's canonicalized title when present
		const title: string = typeof data?.title === 'string' && data.title ? data.title : topic;
		// Prefer detailed extract; fall back to one-line description; truncate defensively
		const extract: string | null = data?.extract ? String(data.extract).slice(0, 800) : (data?.description ? String(data.description) : null);
		const out = { title, extract, type };
		// Cache for ~12h; page summaries change infrequently
		await cacheSet(key, out, 60 * 60 * 12);
		return out;
	} catch {
		// Fail silently to keep upstream flows resilient
		return null;
	}
}

