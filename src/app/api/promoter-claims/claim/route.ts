import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
export async function POST(request: NextRequest) {
  return daySheetProxy(request, '/promoter-claims/claim', { method: 'POST', body: JSON.stringify(await request.json()) });
}
