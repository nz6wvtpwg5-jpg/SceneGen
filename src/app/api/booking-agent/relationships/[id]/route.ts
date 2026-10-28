import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.text();
  return daySheetProxy(request, `/booking-agent-relationships/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: { message: 'Invalid booking-agent relationship' } }, { status: 422 });
  return daySheetProxy(request, `/booking-agent-relationships/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
