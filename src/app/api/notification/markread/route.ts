import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');
  if (!authorization || !entityId) return NextResponse.json({ error: 'Entity context is required' }, { status: 400 });
  const response = await fetch(`${getBackendUrl()}/api/notification/markread`, {
    method: 'POST', headers: { Authorization: authorization, 'X-Entity-Id': entityId, 'Content-Type': 'application/json' },
    body: await request.text()
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
