import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; changeId: string; decision: string }> }) {
  const { id, changeId, decision } = await context.params;
  if (!UUID.test(id) || !UUID.test(changeId) || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: { message: 'Invalid change decision' } }, { status: 400 });
  }
  return daySheetProxy(request, `/shows/${encodeURIComponent(id)}/change-requests/${encodeURIComponent(changeId)}/${decision}`, { method: 'POST', body: '{}' });
}
