import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return daySheetProxy(request, `/booking-agent/band-invitations/${encodeURIComponent(token)}`);
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return daySheetProxy(request, `/booking-agent/band-invitations/${encodeURIComponent(token)}/accept`, {
    method: 'POST', body: JSON.stringify(await request.json()),
  });
}
