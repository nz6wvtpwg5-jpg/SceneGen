import { NextRequest, NextResponse } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
import { collaboratorIdentityHeaders } from '@/lib/collaboratorIdentity';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; noticeId: string }> }) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) return NextResponse.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  const { id, noticeId } = await context.params;
  if (!UUID.test(id) || !UUID.test(noticeId)) return NextResponse.json({ error: { message: 'Invalid notice' } }, { status: 400 });
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/notices/${encodeURIComponent(noticeId)}/acknowledge`, { method: 'POST', headers: identity, body: '{}' });
}
