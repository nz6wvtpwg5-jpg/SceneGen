import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export function GET(request: NextRequest) {
  return daySheetProxy(request, '/contacts/promoter-shortlist');
}

export function POST(request: NextRequest) {
  return request.text().then(body => daySheetProxy(request, '/contacts/promoter-shortlist', { method: 'POST', body }));
}
