import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = (await context.params).id;
  if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid tour ID' } }, { status: 400 });
  return daySheetProxy(request, `/tours/${encodeURIComponent(id)}/health`);
}
