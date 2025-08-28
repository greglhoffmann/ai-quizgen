import { describe, it, expect } from 'vitest'
import { normalizeQuestions, scoreQuiz } from '../src/lib/quiz'

describe('normalizeQuestions', () => {
  it('filters invalid and keeps valid questions', () => {
    const input = [
      { question: 'Valid?', options: ['A', 'B', 'C', 'D'], answerIndex: 1 },
      { question: 'Too few options', options: ['A', 'B', 'C'], answerIndex: 0 },
      { question: '', options: ['A', 'B', 'C', 'D'], answerIndex: 0 },
      { question: 'Bad answer index', options: ['A', 'B', 'C', 'D'], answerIndex: 5 },
    ]
    const out = normalizeQuestions(input)
    expect(out).toHaveLength(1)
    expect(out[0].answerIndex).toBe(1)
  })
})

describe('scoreQuiz', () => {
  it('handles unanswered as incorrect and returns counts', () => {
    const quiz = {
      topic: 't',
      difficulty: 'Easy',
      questions: [
        { question: 'q1', options: ['A', 'B', 'C', 'D'], answerIndex: 0 },
        { question: 'q2', options: ['A', 'B', 'C', 'D'], answerIndex: 1 },
      ],
    } as any
    const res = scoreQuiz(quiz, [-1, 1])
    expect(res.correct).toBe(1)
    expect(res.total).toBe(2)
    expect(res.correctness).toEqual([false, true])
  })
})
