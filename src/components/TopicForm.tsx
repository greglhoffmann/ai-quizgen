/**
 * TopicForm (client component)
 * - Collects topic/difficulty and triggers quiz generation via API.
 * - Shows an ambiguity hint if the server selects a specific sense.
 */
'use client';

import { useState } from 'react';

export default function TopicForm({ onLoaded, onError }: { onLoaded: (quiz: any | null) => void; onError: (msg: string) => void }) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [useRetrieval, setUseRetrieval] = useState(true);
  const [loading, setLoading] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const [forceFreshNext, setForceFreshNext] = useState(false);
  const [ambigHint, setAmbigHint] = useState<string>('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    onError('');
    onLoaded(null);
    if (forceFreshNext) setForceFreshNext(false);
    if (cacheHit) setCacheHit(false);
    if (ambigHint) setAmbigHint('');
    try {
      const finalTopic = topic;
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: finalTopic, difficulty, useRetrieval, forceFresh: forceFreshNext })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to generate quiz');
      if (data?._usage) console.debug('LLM usage', data._usage);
      setCacheHit(!!data?._cacheHit);
      if (data?._assumedTitle) {
        const assumed = String(data._assumedTitle);
        const inTopic = (finalTopic || topic).trim().toLowerCase();
        const differs = assumed.trim().toLowerCase() !== inTopic;
        if (data?._ambiguous || differs) setAmbigHint(`Assuming ${assumed}. Refine the topic if you meant another sense.`);
      }
      onLoaded(data);
      if (forceFreshNext) setForceFreshNext(false);
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Something went wrong';
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-200">Topic</label>
        <input
          type="text"
          value={topic}
          disabled={loading}
          onChange={(e) => {
            setTopic(e.target.value);
            if (cacheHit) setCacheHit(false);
            if (ambigHint) setAmbigHint('');
          }}
          placeholder="e.g., Photosynthesis"
          className="w-full rounded border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 placeholder:text-gray-400"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-200">Difficulty</label>
        <select value={difficulty} disabled={loading} onChange={(e) => setDifficulty(e.target.value as any)} className="w-full rounded border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 disabled:opacity-60">
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-200">
        <input type="checkbox" checked={useRetrieval} disabled={loading} onChange={(e) => setUseRetrieval(e.target.checked)} />
        Use retrieval (Wikipedia) for factual accuracy
      </label>

      <button
        disabled={loading}
        className="inline-flex items-center justify-center rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? 'Generating…' : 'Generate Quiz'}
      </button>
      {cacheHit && (
        <div className="text-xs text-gray-300 mt-2">
          This quiz was loaded from cache.{' '}
          <button
            type="button"
            disabled={loading}
            className="text-blue-400 underline hover:text-blue-300 disabled:opacity-50"
            onClick={async () => {
              try {
                setLoading(true);
                onError('');
                if (cacheHit) setCacheHit(false);
                onLoaded(null);
                setForceFreshNext(true);
                if (ambigHint) setAmbigHint('');
                const finalTopic = topic;
                const res = await fetch('/api/generate-quiz', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ topic: finalTopic, difficulty, useRetrieval, forceFresh: true })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Failed to generate quiz');
                setCacheHit(!!data?._cacheHit);
                if (data?._assumedTitle) {
                  const assumed = String(data._assumedTitle);
                  const inTopic = (finalTopic || topic).trim().toLowerCase();
                  const differs = assumed.trim().toLowerCase() !== inTopic;
                  if (data?._ambiguous || differs) setAmbigHint(`Assuming ${assumed}. Refine the topic if you meant another sense.`);
                }
                onLoaded(data);
                setForceFreshNext(false);
              } catch (err: any) {
                onError(err.message || 'Something went wrong');
              } finally {
                setLoading(false);
              }
            }}
          >
            Generate a fresh one
          </button>
        </div>
      )}
      {ambigHint && (
        <div className="text-xs text-amber-100 bg-amber-900/50 border border-amber-800 rounded p-2 mt-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <div className="flex-1">{ambigHint}</div>
            <button type="button" className="text-amber-200 underline text-[11px]" onClick={() => setAmbigHint('')}>Dismiss</button>
          </div>
        </div>
      )}
    </form>
  );
}
