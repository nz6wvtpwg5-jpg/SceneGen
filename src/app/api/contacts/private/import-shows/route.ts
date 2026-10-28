import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function POST(request: NextRequest) {
  return daySheetProxy(request, '/contacts/private/import-shows', { method: 'POST', body: '{}' });
}