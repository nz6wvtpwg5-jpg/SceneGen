import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
import { collaboratorIdentityHeaders } from '@/lib/collaboratorIdentity';

export async function GET(request: NextRequest) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) return NextResponse.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  return daySheetProxy(request, '/my-show-proposals', { headers: identity });
}

export async function POST(request: NextRequest) {
  const identity = await collaboratorIdentityHeaders();
  if (!identity) return NextResponse.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: { message: 'Invalid show proposal' } }, { status: 400 }); }
  return daySheetProxy(request, '/show-proposals', { method: 'POST', headers: identity, body: JSON.stringify(body) });
}
