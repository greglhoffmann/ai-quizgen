/**
 * Review index page (server component)
 * - Lists saved quizzes for manual review.
 */
import Link from 'next/link';
import { headers } from 'next/headers';

async function getQuizzes() {
  const h = headers();
  const host = h.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const base = `${protocol}://${host}`;
  const res = await fetch(`${base}/api/quizzes`, { cache: 'no-store' });
  const json = await res.json();
  return json.quizzes || [];
}

export default async function ReviewIndexPage() {
  const quizzes = await getQuizzes();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-100">Review Quizzes</h2>
      <ul className="space-y-2">
        {quizzes.map((q: any) => (
          <li key={q._id} className="rounded border border-gray-700 bg-gray-800 p-3">
            <div className="text-sm text-gray-300"><span className="text-gray-100 font-medium">{q.topic}</span> — {q.difficulty}</div>
            <Link href={`/review/${q._id}`} className="text-blue-300 underline text-sm hover:text-blue-200">Open</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
