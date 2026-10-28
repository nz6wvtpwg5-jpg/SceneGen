import { NextRequest, NextResponse } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
import { documentUploadBody } from '@/lib/documentVaultProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid show ID' } }, { status: 400 });
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/documents`);
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid show ID' } }, { status: 400 });
  const body = await documentUploadBody(request);
  if (!body) return NextResponse.json({ error: { message: 'Choose a supported file no larger than 10 MB' } }, { status: 422 });
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/documents`, { method: 'POST', body: JSON.stringify(body) });
}
