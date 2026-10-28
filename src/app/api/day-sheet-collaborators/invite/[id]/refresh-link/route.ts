import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: { message: 'Invalid invitation' } }, { status: 400 });
  return daySheetProxy(request, `/day-sheet-collaborators/invite/${id}/refresh-link`, { method: 'POST', body: '{}' });
}
