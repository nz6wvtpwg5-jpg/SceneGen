import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; requestId: string }> }) {
  const { id, requestId } = await context.params;
  if (!UUID.test(id) || !UUID.test(requestId)) return NextResponse.json({ error: { message: 'Invalid guest request' } }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: { message: 'Invalid guest decision' } }, { status: 400 }); }
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/guest-list/requests/${encodeURIComponent(requestId)}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; requestId: string }> }) {
  const { id, requestId } = await context.params;
  if (!UUID.test(id) || !UUID.test(requestId)) return NextResponse.json({ error: { message: 'Invalid guest request' } }, { status: 400 });
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/guest-list/requests/${encodeURIComponent(requestId)}`, { method: 'DELETE' });
}
