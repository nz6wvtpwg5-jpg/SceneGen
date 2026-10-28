import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function POST(request: NextRequest) {
  return daySheetProxy(request, '/day-sheet-collaborators/invite', {
    method: 'POST',
    body: JSON.stringify(await request.json()),
  });
}
