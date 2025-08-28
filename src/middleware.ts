/**
 * Middleware (optional)
 * - Currently a no-op pass-through; hook for future auth/logging.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}
