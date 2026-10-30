import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    return Response.json({error:{message:'Invalid introduction ID'}},{status:422});
  return daySheetProxy(request,'/promoter-outreach/requests/'+encodeURIComponent(id),{method:'PATCH',body:await request.text()});
}
