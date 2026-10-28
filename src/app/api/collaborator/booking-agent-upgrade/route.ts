import type { NextRequest } from 'next/server';
import { collaboratorIdentityHeaders } from '@/lib/collaboratorIdentity';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) return Response.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  return daySheetProxy(request, '/my-agent-upgrade-requests', { headers: identity });
}

export async function POST(request: NextRequest) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) return Response.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  const body = await request.json();
  const entityId = String(body.entityId || '');
  if (!/^[0-9a-f-]{36}$/i.test(entityId)) return Response.json({ error: { message: 'Choose a represented band' } }, { status: 422 });
  const requestBody = { ...body };
  delete requestBody.entityId;
  return daySheetProxy(request, `/booking-agent-upgrade-requests/${encodeURIComponent(entityId)}`, {
    method: 'POST', headers: identity, body: JSON.stringify(requestBody),
  });
}
