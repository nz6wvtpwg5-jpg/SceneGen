'use client';
import {useEffect,useState} from 'react';
import {Mail} from 'lucide-react';
type Introduction={id:string;promoterName:string;promoterId:string;message:string;status:'pending'|'accepted'|'declined';createdAt:string};
export function SentPromoterIntroductions({entityId}:{entityId:string}){
  const [items,setItems]=useState<Introduction[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();setItems([]);setLoading(true);setError('');
    fetch('/api/promoter-outreach/sent',{headers:{'X-Entity-Id':entityId},signal:controller.signal,cache:'no-store'})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Cannot load introductions');return data;})
      .then(data=>{if(!controller.signal.aborted)setItems(Array.isArray(data.requests)?data.requests:[]);})
      .catch(caught=>{if(!controller.signal.aborted)setError(caught instanceof Error?caught.message:'Cannot load introductions');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[entityId]);
  return <section className="space-y-4">
    <div className="rounded-lg bg-[#f2e9dd] p-4"><div className="flex items-center gap-2"><Mail size={19}/><h3 className="font-black">Sent introductions</h3></div><p className="mt-2 text-sm text-[#686258]">See whether registered promoters have accepted or declined your booking enquiries. No private email addresses are exchanged.</p></div>
    {loading&&<p className="text-sm text-[#686258]">Loading your requests…</p>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {!loading&&!error&&!items.length&&<p className="rounded-lg border border-black/10 bg-white p-5 text-sm text-[#686258]">No booking introductions sent yet. Explore registered promoters who accept enquiries to get started.</p>}
    {items.map(item=><article key={item.id} className="rounded-lg border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><strong className="text-sm">{item.promoterName}</strong><span className="rounded-full bg-[#eee6da] px-3 py-1 text-xs font-black capitalize">{item.status}</span></div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#504b43]">{item.message}</p>
    </article>)}
  </section>;
}
