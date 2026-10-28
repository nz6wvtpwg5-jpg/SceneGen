import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');
  const { id } = await context.params;
  if (!authorization || !entityId || entityId !== id) return NextResponse.json({ error: 'Invalid entity context' }, { status: 400 });
  const body = await request.json();
  const response = await fetch(`${getBackendUrl()}/api/entities/${encodeURIComponent(id)}/profile`, {
    method: 'PUT', headers: { Authorization: authorization, 'X-Entity-Id': entityId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, entityId }), cache: 'no-store'
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
