import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { guestListExportProxy } from '@/lib/guestListExportProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid show ID' } }, { status: 400 });
  return guestListExportProxy(request, `/shows/${encodeURIComponent(id)}/guest-list/export.csv`);
}
