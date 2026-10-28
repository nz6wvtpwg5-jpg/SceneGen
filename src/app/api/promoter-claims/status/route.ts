import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  return daySheetProxy(request, '/promoter-claims/status?token=' + encodeURIComponent(token));
}
