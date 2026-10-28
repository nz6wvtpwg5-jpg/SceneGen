import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest) {
  const currency = new URL(request.url).searchParams.get('currency');
  const suffix = currency ? `?currency=${encodeURIComponent(currency)}` : '';
  return daySheetProxy(request, `/contact-intelligence${suffix}`);
}
