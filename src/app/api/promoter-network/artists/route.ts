import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
export async function GET(request: NextRequest) {
  return daySheetProxy(request, '/promoter-network/artists?q=' + encodeURIComponent((request.nextUrl.searchParams.get('q') || '').slice(0,80)));
}
