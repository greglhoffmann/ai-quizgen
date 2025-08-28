import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { QuizSchema } from '../src/models/quiz'

// Minimal sample valid quiz
const sample = {
  topic: 'Photosynthesis',
  difficulty: 'Medium',
  questions: [
    {
      question: 'What organelle performs photosynthesis?',
      options: ['Mitochondrion', 'Chloroplast', 'Ribosome', 'Nucleus'],
      answerIndex: 1,
      explanation: 'Chloroplasts contain chlorophyll for photosynthesis.'
    },
    {
      question: 'Which gas is consumed during photosynthesis?',
      options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
      answerIndex: 2,
      explanation: 'Plants take in CO2 and release O2.'
    },
    {
      question: 'Which pigment captures light energy?',
      options: ['Hemoglobin', 'Carotene', 'Chlorophyll', 'Melanin'],
      answerIndex: 2,
      explanation: 'Chlorophyll a is primary in most plants.'
    },
    {
      question: 'Where do light reactions occur?',
      options: ['Stroma', 'Matrix', 'Thylakoid membranes', 'Cytosol'],
      answerIndex: 2,
      explanation: 'Light reactions take place in thylakoid membranes.'
    },
    {
      question: 'What is the sugar produced by photosynthesis?',
      options: ['Lactose', 'Cellulose', 'Glucose', 'Fructose'],
      answerIndex: 2,
      explanation: 'Glucose is produced, later stored as starch.'
    }
  ]
}

describe('QuizSchema', () => {
  it('accepts a valid quiz', () => {
    const parsed = QuizSchema.parse(sample)
    expect(parsed.topic).toBe('Photosynthesis')
    expect(parsed.questions).toHaveLength(5)
  })

  it('rejects invalid answerIndex', () => {
    const invalid = structuredClone(sample)
    invalid.questions[0].answerIndex = 4 // out of range
    expect(() => QuizSchema.parse(invalid)).toThrowError(z.ZodError)
  })

  it('rejects wrong number of options', () => {
    const invalid = structuredClone(sample)
    invalid.questions[1].options = ['A', 'B', 'C'] as any
    expect(() => QuizSchema.parse(invalid)).toThrowError()
  })
})
