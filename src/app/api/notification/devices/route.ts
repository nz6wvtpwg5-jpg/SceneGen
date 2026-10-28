import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

async function forward(request: NextRequest, method: 'POST' | 'DELETE') {
  const authorization = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');
  if (!authorization || !entityId) return NextResponse.json({ error: 'Entity context is required' }, { status: 400 });
  const response = await fetch(`${getBackendUrl()}/api/notification/devices`, {
    method,
    headers: { Authorization: authorization, 'X-Entity-Id': entityId, 'Content-Type': 'application/json' },
    body: await request.text(), cache: 'no-store'
  });
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function POST(request: NextRequest) { return forward(request, 'POST'); }
export async function DELETE(request: NextRequest) { return forward(request, 'DELETE'); }
