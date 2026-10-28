import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { collaboratorIdentityHeaders } from '@/lib/collaboratorIdentity';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; eventId: string }> }) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) return NextResponse.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  const { id, eventId } = await context.params;
  if (!UUID.test(id) || !UUID.test(eventId)) return NextResponse.json({ error: { message: 'Invalid itinerary record' } }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { message: 'Invalid itinerary update' } }, { status: 400 });
  }
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/itinerary/${encodeURIComponent(eventId)}`, { method: 'PATCH', headers: identity, body: JSON.stringify(body) });
}
