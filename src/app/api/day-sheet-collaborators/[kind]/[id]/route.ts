import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function DELETE(request: NextRequest, context: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await context.params;
  if (!['grant', 'invite'].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: { message: 'Invalid access record' } }, { status: 400 });
  }
  return daySheetProxy(request, `/day-sheet-collaborators/${kind}/${id}`, { method: 'DELETE' });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await context.params;
  if (!['grant', 'invite'].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: { message: 'Invalid access record' } }, { status: 400 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { message: 'Invalid permission update' } }, { status: 400 });
  }
  return daySheetProxy(request, `/day-sheet-collaborators/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}
