'use client';
import {useCallback,useEffect,useState} from 'react';
import {toast} from 'sonner';
import Link from 'next/link';
import {Check, X, Mail} from 'lucide-react';
import {PromoterConversation} from '@/components/contacts/PromoterConversation';

type Request={id:string;artistName:string;artistId:string;message:string;status:'pending'|'accepted'|'declined';createdAt:string;artistCity?:string|null;artistCountry?:string|null;artistGenres?:string[];artistLinks?:Record<string,string>};
export function PromoterIntroductionsSettings({entityId}:{entityId:string}){
  const [enabled,setEnabled]=useState(false);
  const [requests,setRequests]=useState<Request[]>([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [processing,setProcessing]=useState<string|null>(null);
  const load=useCallback(async(signal?:AbortSignal)=>{
    const options={headers:{'X-Entity-Id':entityId},cache:'no-store' as const,signal};
    const [pref,inbox]=await Promise.all([fetch('/api/promoter-outreach/preferences',options),fetch('/api/promoter-outreach/inbox',options)]);
    if(!pref.ok || !inbox.ok) throw new Error('Could not load promoter introductions');
    const [settings,data]=await Promise.all([pref.json(),inbox.json()]);
    if(signal?.aborted) return;
    setEnabled(settings.acceptingIntroductions===true);
    setRequests(Array.isArray(data.requests)?data.requests:[]);
  },[entityId]);
  useEffect(()=>{
    const controller=new AbortController();setRequests([]);setEnabled(false);setLoading(true);
    void load(controller.signal).catch(error=>{if(!controller.signal.aborted)toast.error(error.message);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[load]);
  async function updatePreference(next:boolean){
    setBusy(true);
    try{
      const response=await fetch('/api/promoter-outreach/preferences',{method:'PUT',headers:{'Content-Type':'application/json','X-Entity-Id':entityId},body:JSON.stringify({acceptingIntroductions:next})});
      const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Unable to change setting');
      setEnabled(data.acceptingIntroductions===true);
      toast.success(next?'You are now accepting introductions':'Introductions disabled');
    }catch(error){toast.error(error instanceof Error?error.message:'Unable to change setting');}finally{setBusy(false);}
  }
  async function respond(item:Request,status:'accepted'|'declined'){
    if(processing)return;setProcessing(item.id);
    try{
      const response=await fetch('/api/promoter-outreach/requests/'+encodeURIComponent(item.id),{method:'PATCH',headers:{'Content-Type':'application/json','X-Entity-Id':entityId},body:JSON.stringify({status})});
      const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Unable to respond');
      setRequests(items=>items.map(value=>value.id===item.id?{...value,status:data.status}:value));
      toast.success(status==='accepted'?'Introduction accepted':'Introduction declined');
    }catch(error){toast.error(error instanceof Error?error.message:'Unable to respond');}finally{setProcessing(null);}
  }
  return <section className="mt-6 rounded-xl border border-black/10 bg-white p-5 sm:p-6" aria-label="Promoter introductions">
    <div className="flex items-start gap-3"><Mail size={21} className="mt-1 text-[#b64f31]"/><div>
      <h3 className="text-xl font-black">Booking introductions</h3>
      <p className="mt-1 text-sm text-[#686258]">Choose whether registered bands can send you a booking enquiry in SceneGen. This is off by default. Your private contact information is never shown.</p>
    </div></div>
    <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-black/10 bg-[#faf6ef] p-4">
      <input type="checkbox" className="h-5 w-5 accent-[#ff5a36]" checked={enabled} disabled={busy||loading} onChange={event=>void updatePreference(event.target.checked)}/>
      <span className="text-sm font-bold">Accept new booking introductions</span>
    </label>
    <div className="mt-6 border-t border-black/10 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-black">Recent message requests</h4><Link href="/messages?tab=requests" className="inline-flex min-h-10 items-center rounded-full bg-[#171713] px-4 text-xs font-bold text-white">Open Messages</Link></div>
      {loading?<p className="mt-3 text-sm text-[#686258]">Loading requests…</p>:requests.length===0?<p className="mt-3 text-sm text-[#686258]">No introductions yet.</p>:<div className="mt-3 space-y-3">{requests.map(item=><article key={item.id} className="rounded-lg border border-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{item.artistName}</strong><span className="text-xs font-bold capitalize text-[#777168]">{item.status}</span></div>
        <p className="mt-2 text-xs text-[#686258]">{[item.artistCity,item.artistCountry].filter(Boolean).join(', ')}{item.artistGenres?.length ? ' · '+item.artistGenres.join(' · ') : ''}</p>
        <div className="mt-2 flex flex-wrap gap-2">{Object.entries(item.artistLinks||{}).map(([network,url])=><a key={network} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-black/15 px-3 py-2 text-xs font-bold capitalize underline">{network}</a>)}</div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#504b43]">{item.message}</p>
        {item.status==='accepted'&&<PromoterConversation key={item.id} entityId={entityId} introductionId={item.id}/>}
        {item.status==='pending'&&<div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={Boolean(processing)} onClick={()=>void respond(item,'accepted')} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#171713] px-4 text-xs font-bold text-white disabled:opacity-50"><Check size={15}/> Accept</button>
          <button type="button" disabled={Boolean(processing)} onClick={()=>void respond(item,'declined')} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/15 px-4 text-xs font-bold disabled:opacity-50"><X size={15}/> Decline</button>
        </div>}
      </article>)}</div>}
    </div>
  </section>;
}
