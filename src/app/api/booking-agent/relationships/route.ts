import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest) {
  const entityId = request.nextUrl.searchParams.get('entityId') || '';
  return daySheetProxy(request, `/booking-agent-relationships?entityId=${encodeURIComponent(entityId)}`);
}
