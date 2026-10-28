import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
import { documentDownloadProxy, documentUploadBody } from '@/lib/documentVaultProxy';
import { getBackendUrl } from '@/lib/backend';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedSuffix = /^(?:|updates|visit|logistics|itinerary(?:\/[0-9a-f-]{36})?|advance(?:\/[0-9a-f-]{36})?|documents(?:\/[0-9a-f-]{36}(?:\/acknowledge|\/content)?)?|notices\/[0-9a-f-]{36}\/acknowledge)$/i;
const methodAllowed = (method: string, suffix: string) => {
  if (!suffix) return ['GET', 'PATCH'].includes(method);
  if (['updates', 'logistics', 'itinerary', 'advance', 'documents'].includes(suffix)) return method === 'GET' || (suffix !== 'updates' && ['POST', 'PATCH'].includes(method));
  if (suffix === 'visit' || suffix.endsWith('/acknowledge')) return method === 'POST';
  if (suffix.endsWith('/content')) return method === 'GET';
  if (suffix.startsWith('itinerary/')) return ['PATCH', 'DELETE'].includes(method);
  if (suffix.startsWith('advance/')) return ['PATCH', 'DELETE'].includes(method);
  if (/^documents\/[0-9a-f-]{36}$/i.test(suffix)) return method === 'DELETE';
  return false;
};

type Context = { params: Promise<{ id: string; path?: string[] }> };

async function agentCanAccessShow(request: NextRequest, showId: string) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return false;
  try {
    const response = await fetch(`${getBackendUrl()}/api/my-day-sheets?bookingAgentOnly=true`, {
      headers: {
        authorization,
        ...(request.headers.get('x-user-email') ? { 'x-user-email': request.headers.get('x-user-email') as string } : {}),
      },
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Array.isArray(data.shows) && data.shows.some((show: { id?: string }) => String(show.id) === showId);
  } catch {
    return false;
  }
}

async function proxy(request: NextRequest, context: Context) {
  const { id, path = [] } = await context.params;
  const suffix = path.join('/');
  const method = request.method.toUpperCase();
  if (!UUID.test(id) || !allowedSuffix.test(suffix) || !methodAllowed(method, suffix)) {
    return NextResponse.json({ error: { message: 'Invalid booking-agent day-sheet route' } }, { status: 400 });
  }
  if (!(await agentCanAccessShow(request, id))) {
    return NextResponse.json({ error: { message: 'This show is outside your active booking-agent access period' } }, { status: 403 });
  }
  const backendPath = `/shows/${encodeURIComponent(id)}${suffix ? `/${suffix}` : ''}`;
  if (method === 'GET' && suffix.endsWith('/content')) return documentDownloadProxy(request, backendPath);
  if (method === 'POST' && suffix === 'documents') {
    const upload = await documentUploadBody(request);
    if (!upload) return NextResponse.json({ error: { message: 'Choose a supported file no larger than 10 MB' } }, { status: 422 });
    return daySheetProxy(request, backendPath, { method, body: JSON.stringify(upload) });
  }
  const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await request.text() : undefined;
  return daySheetProxy(request, backendPath, { method, ...(body ? { body } : {}) });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
