import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function GET(request: NextRequest) {
  const incoming = request.nextUrl.searchParams;
  const params = new URLSearchParams();
  if (incoming.has('q')) params.set('q',(incoming.get('q') || '').slice(0,80));
  for (const genre of incoming.getAll('genre').slice(0,12)) params.append('genre',genre.slice(0,45));
  for (const key of ['city','country']) if (incoming.has(key)) params.set(key,(incoming.get(key) || '').slice(0,120));
  return daySheetProxy(request,'/contacts/search-profiles' + (params.size ? '?' + params.toString() : ''));
}
