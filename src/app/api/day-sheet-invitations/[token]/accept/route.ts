import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
import { collaboratorIdentityHeaders } from '@/lib/collaboratorIdentity';

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) return Response.json({ error: { message: 'Open the invitation link to continue securely' } }, { status: 401 });
  const { token } = await context.params;
  return daySheetProxy(request, `/day-sheet-invitations/${encodeURIComponent(token)}/accept`, { method: 'POST', headers: identity, body: '{}' });
}
