/**
 * Results index page (server component)
 * - Fetches recent saved results via API and lists them.
 * - Shows the result save time; links to detail and review pages.
 */
import Link from 'next/link';
import { headers } from 'next/headers';

async function getResults() {
  const h = headers();
  const host = h.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const base = `${protocol}://${host}`;
  const res = await fetch(`${base}/api/results`, { cache: 'no-store' });
  const json = await res.json();
  return json.results || [];
}

export default async function ResultsIndexPage() {
  const results = await getResults();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-100">Results</h2>
      <ul className="space-y-2">
        {results.map((r: any) => (
          <li key={r._id} className="rounded border border-gray-700 bg-gray-800 p-3">
            <div className="text-sm text-gray-300 flex flex-wrap gap-2 items-center">
              <span className="font-medium text-gray-100">{r.quizTopic || 'Untitled'}</span>
              <span className="text-gray-400">— {r.quizDifficulty || 'Unknown'}</span>
            </div>
            <div className="text-xs text-gray-400">{r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'}</div>
            <div className="text-sm text-gray-200">Score: {r.score?.correct}/5</div>
            <div className="flex gap-3 mt-1">
              <Link href={`/results/${r._id}`} className="text-blue-300 underline text-sm hover:text-blue-200">View result</Link>
              <Link href={`/review/${r.quizId}`} className="text-blue-300 underline text-sm hover:text-blue-200">Review quiz</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
