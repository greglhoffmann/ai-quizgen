/**
 * Review a single quiz (server component)
 * - Fetches quiz by id, shows all questions/options with the correct answer.
 */
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

async function getQuiz(id: string) {
  const h = headers();
  const host = h.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const base = `${protocol}://${host}`;
  const res = await fetch(`${base}/api/quizzes?id=${id}`, { cache: 'no-store' });
  const json = await res.json();
  return json.quiz || null;
}

export default async function ReviewQuizPage({ params }: { params: { id: string } }) {
  const quiz = await getQuiz(params.id);
  if (!quiz) return notFound();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-100">{quiz.topic} — {quiz.difficulty}</h2>
      <ol className="space-y-3 list-decimal pl-5">
        {quiz.questions.map((q: any, idx: number) => (
          <li key={idx}>
            <div className="font-medium text-gray-100">{q.question}</div>
            <ul className="text-sm text-gray-300 mt-1 space-y-1">
              {q.options?.map((opt: string, i: number) => (
                <li key={i}><span className="inline-block w-5 text-gray-400">{String.fromCharCode(65 + i)}.</span> {opt}</li>
              ))}
            </ul>
            <div className="text-sm text-gray-300 mt-1">Correct: {String.fromCharCode(65 + q.answerIndex)}. {q.options[q.answerIndex]}</div>
            {q.explanation && <div className="text-sm text-gray-400">Explanation: {q.explanation}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
