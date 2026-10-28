import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; changeId: string }> }) {
  const { id, changeId } = await context.params;
  if (!UUID.test(id) || !UUID.test(changeId)) {
    return NextResponse.json({ error: { message: 'Invalid change record' } }, { status: 400 });
  }
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/changes/${encodeURIComponent(changeId)}/revert`, { method: 'POST', body: '{}' });
}
