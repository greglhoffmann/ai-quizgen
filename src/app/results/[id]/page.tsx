/**
 * Result details page (server component)
 * - Loads a single saved result and its quiz for context.
 * - Displays labeled answers and correctness per question.
 */
import { headers } from 'next/headers';
import Link from 'next/link';

async function getData(id: string) {
  const h = headers();
  const host = h.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const base = `${protocol}://${host}`;
  const res = await fetch(`${base}/api/results?id=${id}`, { cache: 'no-store' });
  const json = await res.json();
  return json.result || null;
}

export default async function ResultPage({ params }: { params: { id: string } }) {
  const result = await getData(params.id);
  if (!result) return <div className="text-sm">Result not found.</div>;

  // Fetch the quiz as well for details
  const h = headers();
  const host = h.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const base = `${protocol}://${host}`;
  const qRes = await fetch(`${base}/api/quizzes?id=${result.quizId}`, { cache: 'no-store' });
  const qJson = await qRes.json();
  const quiz = qJson.quiz;

  return (
    <div className="space-y-4">
  <h2 className="text-xl font-semibold text-gray-100">Result</h2>
  <div className="text-sm text-gray-300">Quiz: <Link href={`/review/${result.quizId}`} className="text-blue-300 underline hover:text-blue-200">{result.quizId}</Link></div>
  <div className="text-sm text-gray-200">Score: {result.score?.correct}/5</div>

      <ol className="space-y-3 list-decimal pl-5">
        {quiz?.questions?.map((q: any, idx: number) => (
          <li key={idx}>
    <div className="font-medium text-gray-100">{q.question}</div>
    <div className="text-sm text-gray-300">Your answer: {typeof result.answers?.[idx] === 'number' && result.answers[idx] >= 0 ? `${String.fromCharCode(65 + result.answers[idx])}. ${q.options[result.answers[idx]]}` : '—'}</div>
    <div className="text-sm text-gray-300">Correct answer: {String.fromCharCode(65 + q.answerIndex)}. {q.options[q.answerIndex]}</div>
    {q.explanation && <div className="text-sm text-gray-400">Explanation: {q.explanation}</div>}
    <div className={`text-sm ${result.correctness?.[idx] ? 'text-green-400' : 'text-red-400'}`}>
              {result.correctness?.[idx] ? 'Correct' : 'Incorrect'}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
