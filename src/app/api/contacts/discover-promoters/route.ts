import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest) {
  const incoming = request.nextUrl.searchParams;
  const params = new URLSearchParams();
  if (incoming.has('q')) params.set('q', (incoming.get('q') || '').slice(0, 80));
  // An explicit blank genre list allows users to search by name only.
  if (incoming.has('genre')) {
    for (const genre of incoming.getAll('genre').slice(0, 12)) params.append('genre', genre.slice(0, 45));
  }
  for (const field of ['city','country']) if (incoming.has(field)) params.set(field,(incoming.get(field)||'').slice(0,120));
  const suffix = params.size ? '?' + params.toString() : '';
  return daySheetProxy(request, '/contacts/discover-promoters' + suffix);
}
