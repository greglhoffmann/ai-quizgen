/**
 * GET /api/health
 * Returns { ok: true, ts: number } for uptime checks.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
