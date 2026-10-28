import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const relationshipId = String(body.relationshipId || '');
  if (!/^[0-9a-f-]{36}$/i.test(relationshipId)) return Response.json({ error: { message: 'Invalid booking-agent activation' } }, { status: 422 });
  return daySheetProxy(request, `/booking-agent-activations/${encodeURIComponent(relationshipId)}/confirm`, { method: 'POST' });
}
