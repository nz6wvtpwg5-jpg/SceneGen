import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_TYPES = new Set([
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'image/jpeg', 'image/png', 'image/webp',
]);

export async function documentUploadBody(request: NextRequest) {
  let form: FormData;
  try { form = await request.formData(); } catch { return null; }
  const file = form.get('file');
  if (!(file instanceof File) || !DOCUMENT_TYPES.has(file.type) || file.size < 1 || file.size > MAX_DOCUMENT_BYTES) return null;
  const title = String(form.get('title') || '').trim();
  const category = String(form.get('category') || '');
  const scope = String(form.get('scope') || '');
  if (!title || title.length > 200 || !file.name.trim() || file.name.length > 255) return null;
  return {
    fileName: file.name,
    mimeType: file.type,
    data: Buffer.from(await file.arrayBuffer()).toString('base64'),
    title,
    notes: String(form.get('notes') || ''),
    category,
    scope,
    visibleToCollaborators: form.get('visibleToCollaborators') === 'true',
    permissionLevel: String(form.get('permissionLevel') || 'operations'),
    requiresAcknowledgement: form.get('requiresAcknowledgement') === 'true',
  };
}

export async function documentDownloadProxy(request: NextRequest, path: string, identity?: Record<string, string>) {
  const headers = new Headers(identity);
  const authorization = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');
  if (!headers.has('authorization') && authorization) headers.set('authorization', authorization);
  if (!headers.has('x-entity-id') && entityId) headers.set('x-entity-id', entityId);
  const response = await fetch(`${getBackendUrl()}/api${path}`, { headers, cache: 'no-store' });
  if (!response.ok) {
    let message = 'Document not found';
    try { message = (await response.json()).error?.message || message; } catch {}
    return NextResponse.json({ error: { message } }, { status: response.status });
  }
  const responseHeaders = new Headers({
    'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
    'Content-Disposition': response.headers.get('content-disposition') || 'attachment',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  const contentLength = response.headers.get('content-length');
  if (contentLength) responseHeaders.set('Content-Length', contentLength);
  return new NextResponse(response.body, { status: 200, headers: responseHeaders });
}
