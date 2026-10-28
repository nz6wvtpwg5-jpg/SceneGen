import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
export async function POST(request: NextRequest) {
  const body = await request.text();
  return daySheetProxy(request, '/tours/import-calendar', { method: 'POST', body });
}
