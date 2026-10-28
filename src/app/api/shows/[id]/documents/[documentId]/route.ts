import { NextRequest, NextResponse } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await context.params;
  if (!UUID.test(id) || !UUID.test(documentId)) return NextResponse.json({ error: { message: 'Invalid document' } }, { status: 400 });
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' });
}
