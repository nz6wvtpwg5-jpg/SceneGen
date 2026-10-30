import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({error:{message:'Invalid bookmark ID'}},{status:422});
  return daySheetProxy(request, '/contacts/promoter-shortlist/' + encodeURIComponent(id), {method:'DELETE'});
}
