import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { collaboratorIdentityHeaders } from '@/lib/collaboratorIdentity';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function details(context: { params: Promise<{ id: string }> }) {
  return { id: (await context.params).id, identity: await collaboratorIdentityHeaders() };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id, identity } = await details(context);
  if (!identity) return NextResponse.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid show ID' } }, { status: 400 });
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/advance`, { headers: identity });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id, identity } = await details(context);
  if (!identity) return NextResponse.json({ error: { message: 'Collaborator sign-in required' } }, { status: 401 });
  if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid show ID' } }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { message: 'Invalid checklist task' } }, { status: 400 });
  }
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/advance`, { method: 'POST', headers: identity, body: JSON.stringify(body) });
}
