import { NextRequest, NextResponse } from 'next/server';
import { collaboratorAuth } from '@/collaborator-auth';
import { collaboratorIdentityHeaders } from '@/lib/collaboratorIdentity';
import { getBackendUrl } from '@/lib/backend';
import { issueToken } from '@/lib/auth-db';

export async function POST(request: NextRequest) {
  const session = await collaboratorAuth();
  const identity = await collaboratorIdentityHeaders();
  const userId = session?.user?.id;
  const body = await request.json().catch(() => ({}));
  const relationshipId = String(body.relationshipId || '');
  if (!userId || !identity) return NextResponse.json({ error: { message: 'Your day-sheet session has expired' } }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(relationshipId)) return NextResponse.json({ error: { message: 'Invalid booking-agent approval' } }, { status: 422 });
  const response = await fetch(`${getBackendUrl()}/api/my-agent-upgrade-requests/${encodeURIComponent(relationshipId)}/activate`, {
    method: 'POST', headers: { ...identity, 'Content-Type': 'application/json' }, cache: 'no-store',
  });
  const data = await response.json().catch(() => ({ error: { message: 'The activation service returned an invalid response' } }));
  if (!response.ok) return NextResponse.json(data, { status: response.status });
  const token = await issueToken(userId, 'booking_agent_activation', 5);
  return NextResponse.json({ token, activation: data.activation });
}
