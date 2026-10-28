import type { NextRequest } from 'next/server';
import { collaboratorIdentityHeaders } from '@/lib/collaboratorIdentity';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) {
    return Response.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  }
  return daySheetProxy(request, '/my-day-sheets', { headers: identity });
}

export async function PATCH(request: NextRequest) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) {
    return Response.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  }
  return daySheetProxy(request, '/my-day-sheet-profile', {
    method: 'PATCH',
    headers: identity,
    body: JSON.stringify(await request.json()),
  });
}
