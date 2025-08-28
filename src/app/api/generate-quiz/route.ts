/**
 * POST /api/generate-quiz
 * - Accepts a topic and difficulty; optional retrieval and caching flags.
 * - Uses OpenAI (JSON mode) to generate questions; returns normalized JSON.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildPrompt, generateTextJSON } from '../../../lib/ai';
import { QuizSchema } from '../../../models/quiz';
import { cacheGet, cacheSet, cacheDel } from '../../../lib/cache';
import { fetchWikipediaSummary, fetchWikipediaPageInfo } from '../../../lib/retrieval';
import { normalizeQuestions } from '../../../lib/quiz';
import { MIN_QUESTIONS, MAX_QUESTIONS } from '../../../lib/config';
import { sanitizeTopic, isTopicValid } from '../../../lib/sanitize';
import { rateLimit } from '../../../lib/rate-limit';

const BodySchema = z.object({
	topic: z.string().min(2),
	difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
	useRetrieval: z.boolean().optional().default(true),
	numQuestions: z.number().int().optional(),
	forceFresh: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
	try {
		// 1) Basic per-IP rate limit to prevent abuse (20 requests per 60 seconds by default)
		// - Uses Redis if available for cross-instance limits; otherwise a local in-memory fallback.
		const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
		const { allowed, remaining, reset } = await rateLimit(ip, 'generate-quiz', 20, 60);
		if (!allowed) {
			// HTTP 429 (Too Many Requests) with Retry-After header informs clients when to retry
			const res = NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
			res.headers.set('Retry-After', String(Math.max(1, Math.floor(reset - Date.now() / 1000))));
			res.headers.set('X-RateLimit-Limit', '20');
			res.headers.set('X-RateLimit-Remaining', String(remaining));
			res.headers.set('X-RateLimit-Reset', String(reset));
			return res;
		}
		const body = await req.json();
	// 2) Validate and sanitize the incoming request body (using Zod schema)
	const { topic: rawTopic, difficulty, useRetrieval, numQuestions, forceFresh } = BodySchema.parse(body);
		const topic = sanitizeTopic(rawTopic);
		if (!isTopicValid(topic)) {
			return NextResponse.json({ error: 'Please provide a more specific topic.' }, { status: 400 });
		}

		const topicToUse = topic;
		const cacheKey = `quiz:${difficulty}:${topicToUse.toLowerCase()}`;
	// 3) Cache handling: reuse a previously generated quiz unless forceFresh=true
	if (forceFresh) {
			await cacheDel(cacheKey);
		} else {
			const cached = await cacheGet<any>(cacheKey);
			if (cached) return NextResponse.json({ ...cached, _cacheHit: true }, { status: 200 });
		}

		// Hybrid-light retrieval: get page info to canonicalize and detect ambiguity (best-effort)
		let assumedTitle: string | null = null;
		let ambiguous = false;
		let wiki = null as string | null;
		// 4) Optional retrieval step: query Wikipedia summary for context and detect ambiguity
		if (useRetrieval) {
			const info = await fetchWikipediaPageInfo(topicToUse);
			if (info) {
				assumedTitle = info.title || null;
				ambiguous = info.type === 'disambiguation';
				wiki = info.extract;
			}
			if (!wiki) {
				wiki = await fetchWikipediaSummary(topicToUse);
			}
		}
		const n = Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, numQuestions ?? MIN_QUESTIONS));
		const titleForPrompt = assumedTitle || topicToUse;
		// 5) Build a deterministic prompt (JSON-mode) so the model returns a parseable object
		const prompt = buildPrompt(titleForPrompt, difficulty, wiki ?? undefined, n);

		// 6) Call the model; we get back { text, usage } where text should be JSON per the prompt
		const { text, usage } = await generateTextJSON(prompt, 'gpt-4o-mini');
		let json: any;
		try {
			// Parse JSON directly; if that fails, try extracting a JSON array substring
			json = JSON.parse(text);
		} catch {
			const match = text.match(/\[[\s\S]*\]/);
			if (match) json = JSON.parse(match[0]);
		}

		if (!json) {
			return NextResponse.json({ error: 'Model did not return JSON. Please try again.' }, { status: 502 });
		}
		// 7) Support both array and object-with-questions shapes; also capture the model's chosen sense/title
		const chosenTitle: string | undefined = typeof json?.chosenTitle === 'string' ? json.chosenTitle : undefined;
		const questionsInput = Array.isArray(json?.questions) ? json.questions : json;
		const normalized = normalizeQuestions(questionsInput);
	const payload = { topic: topicToUse, difficulty, questions: normalized };
		// 8) Validate final payload using the shared schema before returning to clients
		const parsed = QuizSchema.parse(payload);

		// 9) Cache the validated quiz for an hour to reduce costs and latency
		await cacheSet(cacheKey, parsed, 60 * 60);
	return NextResponse.json({ ...parsed, _cacheHit: false, _ambiguous: ambiguous, _assumedTitle: chosenTitle || assumedTitle || undefined, _usage: usage }, { status: 200 });
	} catch (err: any) {
		// 10) Error handling: distinguish validation errors vs generic server failures
		const msg = err?.name === 'ZodError' ? 'Invalid request' : (err?.message || 'Failed to generate');
		const status = err?.name === 'ZodError' ? 400 : 500;
		return NextResponse.json({ error: msg }, { status });
	}
}
