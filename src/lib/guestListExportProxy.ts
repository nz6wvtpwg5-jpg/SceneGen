import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function guestListExportProxy(request: NextRequest, path: string) {
  const headers = new Headers();
  const authorization = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');
  if (authorization) headers.set('authorization', authorization);
  if (entityId) headers.set('x-entity-id', entityId);
  const response = await fetch(`${getBackendUrl()}/api${path}`, { headers, cache: 'no-store' });
  if (!response.ok) {
    let message = 'Guest list could not be exported';
    try { message = (await response.json()).error?.message || message; } catch {}
    return NextResponse.json({ error: { message } }, { status: response.status });
  }
  return new NextResponse(response.body, { status: 200, headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': response.headers.get('content-disposition') || 'attachment; filename="guest-list.csv"',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}
