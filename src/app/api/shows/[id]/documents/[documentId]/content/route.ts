import { NextRequest, NextResponse } from 'next/server';
import { documentDownloadProxy } from '@/lib/documentVaultProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await context.params;
  if (!UUID.test(id) || !UUID.test(documentId)) return NextResponse.json({ error: { message: 'Invalid document' } }, { status: 400 });
  return documentDownloadProxy(request, `/shows/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/content`);
}
