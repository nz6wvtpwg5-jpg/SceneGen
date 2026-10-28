import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
export async function GET(request: NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({error:{message:'Invalid venue ID'}},{status:422});
  return daySheetProxy(request,'/venues/'+encodeURIComponent(id));
}