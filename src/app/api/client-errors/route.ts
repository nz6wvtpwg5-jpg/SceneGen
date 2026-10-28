import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const response = await fetch(`${getBackendUrl()}/api/client-errors`, {
    method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json', 'X-Entity-Id': request.headers.get('x-entity-id') || '' },
    body: await request.text(), cache: 'no-store', signal: AbortSignal.timeout(8_000)
  });
  return new NextResponse(null, { status: response.status });
}
