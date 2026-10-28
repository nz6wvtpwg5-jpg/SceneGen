import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');
  if (!authorization || !entityId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const response = await fetch(`${getBackendUrl()}/api/import/preview`, {
    method: 'POST',
    headers: { Authorization: authorization, 'X-Entity-Id': entityId, 'Content-Type': 'application/json' },
    body: await request.text(),
    signal: AbortSignal.timeout(15_000),
  });
  return new NextResponse(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json' } });
}
