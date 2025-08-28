/**
 * AI helpers
 * - buildPrompt: constructs a deterministic prompt and JSON contract for quiz generation.
 * - generateTextJSON: calls OpenAI in JSON mode and returns text + usage.
 */
import OpenAI from 'openai';
import { OPTIONS_PER_QUESTION } from './config';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function buildPrompt(topic: string, difficulty: string, context?: string, numQuestions = 5) {
		const safeTopic = topic.replace(/"/g, '\\"');
				return `You are a precise quiz generator. Create exactly ${numQuestions} multiple-choice questions about the exact topic/sense: "${safeTopic}" at ${difficulty} difficulty.
${context ? `Use ONLY the following context to ensure factual accuracy. If the context appears to be a disambiguation blurb (not a single-topic summary), ignore it. If context is insufficient, stick to widely accepted facts.\n\nCONTEXT:\n${context}\n\n` : ''}
Rules:
- Output JSON only (no prose).
- Treat the topic as the exact Wikipedia page title. If it has parentheses, that qualifier defines the sense.
- If the term is ambiguous and no qualifier is provided, choose ONE sense deterministically and proceed:
		- Prefer the Wikipedia primary topic if one exists.
		- Otherwise, use the most globally well-known sense in general knowledge.
		- If the provided CONTEXT clearly implies a sense, prefer that sense.
		- Do not ask for clarification; do not include any notes about the choice.
- Do NOT include facts from any other sense with the same word. Never mix senses.
- Do NOT mention or compare other senses.
- Each question item must be: { "question": string, "options": array of ${OPTIONS_PER_QUESTION} strings, "answerIndex": 0-${OPTIONS_PER_QUESTION - 1}, "explanation": string }.
- Exactly one correct option; others must be plausible but incorrect for THIS sense only.

Return a JSON object with this exact shape:
{
	"chosenTitle": string, // the precise Wikipedia-like title for the chosen sense, e.g. "Mercury (planet)" or "Python (programming language)"
	"questions": [ ...items ]
}`;
}

export async function generateTextJSON(prompt: string, model = 'gpt-4o-mini'): Promise<{ text: string; usage?: { prompt: number; completion: number; total: number } }> {
	if (!process.env.OPENAI_API_KEY) {
		throw new Error('Server misconfiguration: OPENAI_API_KEY is not set');
	}
	const chat = await openai.chat.completions.create({
		model,
		messages: [
			{ role: 'system', content: 'You return only valid JSON.' },
			{ role: 'user', content: prompt },
		],
		temperature: 0,
		// Encourage strict JSON and limit output size for cost control
		response_format: { type: 'json_object' as any },
		max_tokens: 1200,
	});
	const content = chat.choices?.[0]?.message?.content ?? '';
	const usage = chat.usage ? {
		prompt: chat.usage.prompt_tokens ?? 0,
		completion: chat.usage.completion_tokens ?? 0,
		total: chat.usage.total_tokens ?? 0,
	} : undefined;
	return { text: content, usage };
}

