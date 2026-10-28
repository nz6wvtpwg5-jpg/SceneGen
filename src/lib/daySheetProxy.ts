import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function daySheetProxy(request: NextRequest, path: string, init: RequestInit = {}) {
  const authorization = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');
  const userEmail = request.headers.get('x-user-email');
  const headers = new Headers(init.headers);
  if (!headers.has('authorization') && authorization) headers.set('authorization', authorization);
  if (!headers.has('x-entity-id') && entityId) headers.set('x-entity-id', entityId);
  if (!headers.has('x-user-email') && userEmail) headers.set('x-user-email', userEmail);
  headers.set('content-type', 'application/json');
  const response = await fetch(`${getBackendUrl()}/api${path}`, { ...init, headers, cache: 'no-store' });
  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`Day-sheet API returned a non-JSON response (${response.status})`);
    data = { error: { message: response.ok ? 'The server returned an invalid response' : 'Unable to load day sheets right now' } };
  }
  const proxied = NextResponse.json(data, { status: response.status });
  proxied.headers.set('Cache-Control', response.headers.get('cache-control') || 'private, no-store');
  return proxied;
}
