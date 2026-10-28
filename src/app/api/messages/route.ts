import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

async function forward(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');
  if (!authorization || !entityId) return NextResponse.json({ error: 'Entity context is required' }, { status: 400 });
  const target = new URL('/api/messages', getBackendUrl());
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  const response = await fetch(target, {
    method: request.method,
    headers: { Authorization: authorization, 'X-Entity-Id': entityId, 'Content-Type': 'application/json' },
    body: request.method === 'POST' ? await request.text() : undefined,
    cache: 'no-store'
  });
  return NextResponse.json(await response.json(), { status: response.status });
}

export const GET = forward;
export const POST = forward;
