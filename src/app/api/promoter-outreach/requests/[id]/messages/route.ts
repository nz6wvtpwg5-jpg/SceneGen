import type {NextRequest} from 'next/server';
import {daySheetProxy} from '@/lib/daySheetProxy';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!UUID.test(id))return Response.json({error:{message:'Invalid introduction ID'}},{status:422});
  return daySheetProxy(request,'/promoter-outreach/requests/'+encodeURIComponent(id)+'/messages');
}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!UUID.test(id))return Response.json({error:{message:'Invalid introduction ID'}},{status:422});
  return daySheetProxy(request,'/promoter-outreach/requests/'+encodeURIComponent(id)+'/messages',{
    method:'POST',body:await request.text()});
}
