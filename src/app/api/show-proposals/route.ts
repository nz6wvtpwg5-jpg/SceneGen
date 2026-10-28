import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const entityId = request.nextUrl.searchParams.get('entityId') || '';
  if (!UUID.test(entityId)) return NextResponse.json({ error: { message: 'A valid workspace is required' } }, { status: 400 });
  return daySheetProxy(request, `/show-proposals?entityId=${encodeURIComponent(entityId)}`);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: { message: 'Invalid show proposal' } }, { status: 400 }); }
  return daySheetProxy(request, '/show-proposals', { method: 'POST', body: JSON.stringify(body) });
}
