import type { NextRequest } from 'next/server';
import { collaboratorIdentityHeaders } from '@/lib/collaboratorIdentity';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) return Response.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  return daySheetProxy(request, '/my-represented-workspaces', { headers: identity });
}
