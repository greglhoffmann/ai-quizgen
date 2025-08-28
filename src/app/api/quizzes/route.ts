/**
 * /api/quizzes
 * GET: returns recent persisted quizzes (requires MongoDB)
 * POST: stores a quiz (deduped by content); returns { ok, id }
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(req: Request) {
  // GET quizzes
  // - If `?id=` is provided, return that single quiz document.
  // - Otherwise, return up to 20 recent quizzes, deduplicated by content signature.
  const db = await getDb();
  if (!db) return NextResponse.json({ quizzes: [] });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (id) {
    try {
    // Fetch a single quiz by ObjectId
      const quiz = await db.collection('quizzes').findOne({ _id: new ObjectId(id) });
      if (!quiz) return NextResponse.json({ quiz: null }, { status: 404 });
    // Serialize ObjectId to string for transport
      return NextResponse.json({ quiz: { ...quiz, _id: quiz._id.toString() } });
    } catch {
    // Invalid ObjectId format or lookup error → 400
      return NextResponse.json({ quiz: null }, { status: 400 });
    }
  }
  // List recent quizzes (newest first)
  const raw = await db
    .collection('quizzes')
    .find({}, {})
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  // Deduplicate by content signature to avoid showing near-identical quizzes
  // Signature components: topic, difficulty, and normalized questions (text/options/answer index)
  const seen = new Set<string>();
  const quizzes = [] as any[];
  for (const q of raw) {
    const signature = (() => {
      try {
        const key = JSON.stringify({
          topic: q.topic,
          difficulty: q.difficulty,
          questions: q.questions?.map((qq: any) => ({
            q: qq.question,
            a: qq.answerIndex,
            opts: qq.options
          }))
        });
        return key;
      } catch {
    // Fallback signature if serialization fails
        return `${q.topic}|${q.difficulty}|${q.questions?.length || 0}`;
      }
    })();
    if (seen.has(signature)) continue;
    seen.add(signature);
  // Normalize _id to string; leave other fields as-is
    quizzes.push({ ...q, _id: q._id?.toString?.() });
  }
  return NextResponse.json({ quizzes });
}

export async function POST(req: Request) {
  try {
  // Ensure DB is available (route is a no-op without MongoDB configured)
    const db = await getDb();
    if (!db) return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  // Parse incoming quiz payload (already validated upstream when generated)
    const quiz = await req.json();
  // Idempotency: if an identical quiz already exists, reuse its id to avoid duplicates
    const existing = await db.collection('quizzes').findOne({
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      questions: quiz.questions
    });
    if (existing) {
      return NextResponse.json({ ok: true, id: existing._id.toString() });
    }
  // Insert new quiz with a server-side timestamp
    const { insertedId } = await db.collection('quizzes').insertOne({ ...quiz, createdAt: new Date() });
    return NextResponse.json({ ok: true, id: insertedId.toString() });
  } catch (e: any) {
  // Return a friendly error with 400 for invalid payloads or other failures
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to save quiz' }, { status: 400 });
  }
}
