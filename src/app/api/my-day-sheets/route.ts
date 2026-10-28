import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest) {
  return daySheetProxy(request, '/my-day-sheets');
}
