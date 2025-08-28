import { Quiz, Question } from '@/models/quiz'
import { OPTIONS_PER_QUESTION } from './config'

// Normalize a flexible model output into the strict Question[] shape
export function normalizeQuestions(input: any): Question[] {
	if (!Array.isArray(input)) return []
	const out: Question[] = []
	for (const q of input) {
		const question = typeof q?.question === 'string' ? q.question.trim() : ''
		const options = Array.isArray(q?.options) ? q.options.map((o: any) => String(o ?? '').trim()) : []
		const answerIndex = Number.isInteger(q?.answerIndex) ? q.answerIndex : -1
		const explanation = typeof q?.explanation === 'string' ? q.explanation : undefined
		if (!question || options.length !== OPTIONS_PER_QUESTION) continue
		if (answerIndex < 0 || answerIndex >= OPTIONS_PER_QUESTION) continue
		out.push({ question, options, answerIndex, explanation })
	}
	return out
}

// Score a quiz given user answers (-1 for unanswered)
export function scoreQuiz(quiz: Quiz, answers: number[]) {
	const total = quiz.questions.length
	const norm = Array.from({ length: total }, (_, i) => (typeof answers?.[i] === 'number' ? answers[i] : -1))
	const correctness = quiz.questions.map((q, i) => norm[i] === q.answerIndex)
	const correct = correctness.filter(Boolean).length
	return { correct, total, correctness }
}

