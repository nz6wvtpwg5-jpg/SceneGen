import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function id(context: { params: Promise<{ id: string }> }) { return (await context.params).id; }

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const showId = await id(context);
  if (!UUID.test(showId)) return NextResponse.json({ error: { message: 'Invalid show ID' } }, { status: 400 });
  const view = new URL(request.url).searchParams.get('view');
  const query = view === 'door' || view === 'promoter' ? `?view=${view}` : '';
  return daySheetProxy(request, `/shows/${encodeURIComponent(showId)}/guest-list${query}`);
}
