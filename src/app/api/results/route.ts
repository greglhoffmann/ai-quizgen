import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const BodySchema = z.object({
  quizId: z.string(),
  // -1 means unanswered; length will be normalized to the quiz length
  answers: z.array(z.number().int().min(-1).max(3)).min(1),
});

export async function POST(req: Request) {
  try {
  // 1) Connect to the database (if configured)
  const db = await getDb();
    if (!db) return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  // 2) Parse and validate the incoming body
  const body = await req.json();
  const { quizId, answers } = BodySchema.parse(body);
    const quiz = await db.collection('quizzes').findOne({ _id: new ObjectId(quizId) });
    if (!quiz) return NextResponse.json({ ok: false, error: 'Quiz not found' }, { status: 404 });
  const total = Array.isArray(quiz?.questions) ? quiz.questions.length : 5;

  // 3) Normalize answers to quiz length; treat -1 as unanswered (and thus incorrect)
  const normalizedAnswers: number[] = Array.from({ length: total }, (_, i) => (typeof answers?.[i] === 'number' ? answers[i] : -1));
  const correctness: boolean[] = (quiz.questions || []).map((q: any, i: number) => normalizedAnswers[i] === q.answerIndex);
    const correct = correctness.filter(Boolean).length;

  // 4) Persist the result with the computed score and a server timestamp
  const { insertedId } = await db.collection('results').insertOne({
      quizId: new ObjectId(quizId),
      answers: normalizedAnswers,
      correctness,
      score: { correct, total },
      createdAt: new Date(),
    });
    return NextResponse.json({ ok: true, id: insertedId.toString() });
  } catch (e: any) {
    const msg = e?.name === 'ZodError' ? 'Invalid payload' : (e?.message || 'Failed to save result');
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function GET(req: Request) {
  // GET results
  // - If `?id=` is provided, return that single result.
  // - Otherwise, return up to 50 recent results, joined with quiz metadata.
  const db = await getDb();
  if (!db) return NextResponse.json({ results: [] }, { status: 200 });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (id) {
    // Fetch a single result document by its ObjectId
    const result = await db.collection('results').findOne({ _id: new ObjectId(id) });
    if (!result) return NextResponse.json({ result: null }, { status: 404 });
    // Serialize ObjectId fields to strings for JSON response
    return NextResponse.json({ result: { ...result, _id: result._id.toString(), quizId: result.quizId.toString() } });
  }
  const raw = await db
    .collection('results')
    .aggregate([
      // Newest first
      { $sort: { createdAt: -1 } },
      // Cap list to a reasonable size for UI
      { $limit: 50 },
      // Join with quizzes collection to include topic/difficulty metadata
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz',
        },
      },
      // Unwind (preserve null to allow results even if quiz doc is missing)
      { $unwind: { path: '$quiz', preserveNullAndEmptyArrays: true } },
      // Project only fields needed by the UI; flatten quiz fields
      {
        $project: {
          quizId: 1,
          answers: 1,
          correctness: 1,
          score: 1,
          createdAt: 1,
          quizTopic: '$quiz.topic',
          quizDifficulty: '$quiz.difficulty',
          quizCreatedAt: '$quiz.createdAt',
        },
      },
    ])
    .toArray();
  // Normalize IDs to string for transport
  const results = raw.map((r: any) => ({
    ...r,
    _id: r._id.toString(),
    quizId: r.quizId?.toString?.() || r.quizId,
  }));
  return NextResponse.json({ results });
}
