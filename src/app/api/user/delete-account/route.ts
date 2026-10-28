import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const response = await fetch(`${getBackendUrl()}/api/user/delete-account`, {
    method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: await request.text(), cache: 'no-store', signal: AbortSignal.timeout(15_000)
  });
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await response.json(), { status: response.status });
}
