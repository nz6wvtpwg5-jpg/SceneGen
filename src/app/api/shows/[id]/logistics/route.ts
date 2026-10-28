import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function showId(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = await showId(context);
  if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid show ID' } }, { status: 400 });
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/logistics`);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = await showId(context);
  if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid show ID' } }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { message: 'Invalid logistics update' } }, { status: 400 });
  }
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/logistics`, { method: 'PATCH', body: JSON.stringify(body) });
}
