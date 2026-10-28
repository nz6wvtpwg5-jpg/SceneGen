import { NextRequest } from 'next/server';
import { getBackendUrl } from '@/lib/backend';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null,{status:404});
 const headers:Record<string,string>={};
 for(const key of ['authorization','x-entity-id']) {const val=request.headers.get(key);if(val)headers[key]=val;}
 try {
  const response=await fetch(getBackendUrl()+'/api/venues/'+encodeURIComponent(id)+'/photo',{headers,cache:'no-store'});
  if(!response.ok)return new Response(null,{status:response.status});
  return new Response(response.body,{headers:{'Content-Type':response.headers.get('content-type')||'image/jpeg','Cache-Control':'private, max-age=1800',...(response.headers.get('x-photo-attribution')?{'X-Photo-Attribution':response.headers.get('x-photo-attribution')!}:{})}});
 } catch {return new Response(null,{status:503});}
}
