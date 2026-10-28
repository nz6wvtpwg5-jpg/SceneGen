import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');
  if (!authorization || !entityId) return NextResponse.json({ error: 'Entity context is required' }, { status: 400 });
  const response = await fetch(`${getBackendUrl()}/api/conversations`, {
    headers: { Authorization: authorization, 'X-Entity-Id': entityId }, cache: 'no-store'
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
