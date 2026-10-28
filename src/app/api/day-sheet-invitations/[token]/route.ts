import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return daySheetProxy(request, `/day-sheet-invitations/${encodeURIComponent(token)}`);
}
