import type { NextRequest } from 'next/server';
import { collaboratorIdentityHeaders } from '@/lib/collaboratorIdentity';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, context: { params: Promise<{ entityId: string }> }) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) return Response.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  const { entityId } = await context.params;
  if (!UUID.test(entityId)) return Response.json({ error: { message: 'Invalid represented band' } }, { status: 400 });
  return daySheetProxy(request, `/my-represented-workspaces/${encodeURIComponent(entityId)}`, {
    method: 'PATCH', headers: identity, body: JSON.stringify(await request.json()),
  });
}
