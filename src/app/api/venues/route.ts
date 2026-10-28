import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const incoming = request.nextUrl.searchParams;
  const params = new URLSearchParams();
  for (const key of ['city', 'country', 'query']) {
    const value = incoming.get(key);
    if (value) params.set(key, value);
  }
  const entityId = request.headers.get('x-entity-id');
  try {
    const response = await fetch(`${getBackendUrl()}/api/venues?${params}`, {
      headers: { Authorization: token, ...(entityId ? { 'X-Entity-Id': entityId } : {}) },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({ error: { message: 'The venue directory returned an invalid response' } }));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: { message: 'The venue directory is unavailable' } }, { status: 503 });
  }
}
