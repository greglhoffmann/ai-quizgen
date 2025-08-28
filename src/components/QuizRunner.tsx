/**
 * QuizRunner (client component)
 * - Renders questions/options with A–D labels; collects answers.
 * - After submit, shows correctness, explanations, and a Save for review action.
 */
'use client';

import { useMemo, useState } from 'react';
import { scoreQuiz } from '@/lib/quiz';
import Toast from '@/components/Toast';

export default function QuizRunner({ quiz }: { quiz: any }) {
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(quiz?._id ? String(quiz._id) : null);
  const [toast, setToast] = useState<string>('');

  const score = useMemo(() => {
    if (!submitted) return null;
    const normalizedAnswers = Array.from({ length: quiz.questions.length }, (_, i) => (typeof answers[i] === 'number' ? answers[i] as number : -1));
    return scoreQuiz(quiz, normalizedAnswers);
  }, [submitted, quiz, answers]);

  return (
    <div className="space-y-4">
      {/* Questions */}
      {quiz?.questions?.map((q: any, idx: number) => (
        <div key={idx} className="rounded border border-gray-700 bg-gray-800 p-4">
          <p className="font-medium mb-2 text-gray-100">{idx + 1}. {q.question}</p>
          <div className="grid gap-2">
            {q.options.map((opt: string, optIdx: number) => (
              <label key={optIdx} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`q-${idx}`}
                  checked={answers[idx] === optIdx}
                  onChange={() => setAnswers((prev) => ({ ...prev, [idx]: optIdx }))}
                />
                <span className="inline-block w-5 text-gray-300">{String.fromCharCode(65 + optIdx)}.</span>
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {submitted && (
            <div className="mt-2 text-sm">
              <div>
                {answers[idx] === q.answerIndex ? (
                  <span className="text-green-400">Correct</span>
                ) : (
                  <span className="text-red-400">Incorrect</span>
                )}
              </div>
              <div>
                Correct answer: <span className="font-semibold">{String.fromCharCode(65 + q.answerIndex)}. {q.options[q.answerIndex]}</span>
              </div>
              {q.explanation && (
                <div className="text-gray-300 mt-1">Explanation: {q.explanation}</div>
              )}
            </div>
          )}
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={async () => {
            setSubmitted(true);
          }}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Submit
        </button>
      ) : (
  <div className="mt-2 text-lg">Score: {score?.correct}/{score?.total}</div>
      )}
      {submitted && (
        <div className="flex items-center gap-3">
          <button
            disabled={saving || !!resultId}
            onClick={async () => {
              try {
                setSaving(true);
                // 1) Save quiz for review if not yet saved
                let idToUse = quizId;
                if (!idToUse) {
                  const qRes = await fetch('/api/quizzes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(quiz)
                  });
                  const qData = await qRes.json();
                  if (qRes.ok && qData?.id) {
                    idToUse = String(qData.id);
                    setQuizId(idToUse);
                  }
                }

                if (!idToUse) throw new Error('Could not save quiz for review');

                // Best-effort: save the result, but consider the action successful if the quiz is saved
                try {
                  const arr = Array.from({ length: quiz.questions.length }, (_, i) => (typeof answers[i] === 'number' ? answers[i] as number : -1));
                  const res = await fetch('/api/results', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quizId: idToUse, answers: arr })
                  });
                  const data = await res.json();
                  if (res.ok && data?.id) setResultId(String(data.id));
                } catch {}

                setToast('Saved for review.');
              } catch (e) {
                setToast('Could not save.');
              } finally {
                setSaving(false);
              }
            }}
            className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save for review'}
          </button>
          {resultId && (
            <>
              <a className="text-sm text-blue-300 underline" href={`/results/${resultId}`}>View saved result</a>
              <a className="text-sm text-blue-300 underline" href={`/results`}>All results</a>
            </>
          )}
        </div>
      )}
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
