// Zod schema for a normalized quiz payload used across API and UI
import { z } from 'zod'

export const DifficultySchema = z.enum(['Easy', 'Medium', 'Hard'])

export const QuestionSchema = z.object({
	question: z.string().min(3),
	options: z.array(z.string().min(1)).length(4),
	answerIndex: z.number().int().min(0).max(3),
	explanation: z.string().optional().nullable(),
})

export const QuizSchema = z.object({
	topic: z.string().min(1),
	difficulty: DifficultySchema,
	questions: z.array(QuestionSchema).min(1),
})

export type Difficulty = z.infer<typeof DifficultySchema>
export type Question = z.infer<typeof QuestionSchema>
export type Quiz = z.infer<typeof QuizSchema>

