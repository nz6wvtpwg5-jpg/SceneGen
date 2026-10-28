import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest) {
  const showId = new URL(request.url).searchParams.get('showId');
  const query = showId ? `?showId=${encodeURIComponent(showId)}` : '';
  return daySheetProxy(request, `/day-sheet-templates${query}`);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { message: 'Invalid template' } }, { status: 400 });
  }
  return daySheetProxy(request, '/day-sheet-templates', { method: 'POST', body: JSON.stringify(body) });
}
