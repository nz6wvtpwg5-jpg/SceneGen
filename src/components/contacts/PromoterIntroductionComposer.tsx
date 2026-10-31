'use client';
import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import Link from 'next/link';
import {Send,X} from 'lucide-react';

type SentRequest={id:string;promoterId:string;status:'pending'|'accepted'|'declined'};
export function PromoterIntroductionComposer({entityId,selected,onClose}:{entityId:string;selected:{id:string;name:string}|null;onClose:()=>void}){
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState<SentRequest[]>([]);
  const [links,setLinks]=useState<Record<string,string>>({});
  const [linksLoading,setLinksLoading]=useState(true);
  useEffect(()=>{
    const controller=new AbortController();setSent([]);setMessage('');
    fetch('/api/promoter-outreach/sent',{headers:{'X-Entity-Id':entityId},signal:controller.signal,cache:'no-store'})
      .then(async response=>response.ok?response.json():Promise.reject(new Error('Unable to load introduction history')))
      .then(data=>{if(!controller.signal.aborted)setSent(Array.isArray(data.requests)?data.requests:[]);})
      .catch(()=>{});
    return()=>controller.abort();
  },[entityId]);
  useEffect(()=>{
    const controller=new AbortController();setLinksLoading(true);setLinks({});
    fetch('/api/promoter-outreach/sender-links',{headers:{'X-Entity-Id':entityId},signal:controller.signal,cache:'no-store'})
      .then(async response=>response.ok?response.json():Promise.reject(new Error('Unable to load band links')))
      .then(data=>{if(!controller.signal.aborted)setLinks(data.socialLinks||{});})
      .catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setLinksLoading(false);});
    return()=>controller.abort();
  },[entityId]);
  const validLinks=Object.entries(links).filter(([network,raw])=>{
    if(!['facebook','instagram','spotify','bandcamp','website'].includes(network)||typeof raw!=='string')return false;
    try{return ['http:','https:'].includes(new URL(raw).protocol);}catch{return false;}
  });
  if(!selected)return null;
  const promoterId=selected.id;
  const previous=sent.find(item=>item.promoterId===promoterId);
  const canSend=message.trim().length>=30&&message.trim().length<=500&&!linksLoading&&validLinks.length>0&&!busy&&previous?.status!=='pending'&&previous?.status!=='declined';
  async function submit(){
    if(!canSend)return;setBusy(true);
    try{
      const response=await fetch('/api/promoter-outreach/requests',{method:'POST',headers:{'Content-Type':'application/json','X-Entity-Id':entityId},body:JSON.stringify({promoterId,message:message.trim()})});
      const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Unable to send introduction');
      setSent(items=>[{id:data.id,promoterId,status:'pending'},...items]);
      toast.success('Introduction sent. Track it in Messages → Sent requests.');setMessage('');onClose();
    }catch(error){toast.error(error instanceof Error?error.message:'Unable to send introduction');}finally{setBusy(false);}
  }
  return <div role="presentation" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section role="dialog" aria-modal="true" aria-labelledby="promoter-introduction-title" className="w-full max-w-xl rounded-2xl bg-[#fffaf2] p-6 shadow-xl sm:p-8" onKeyDown={event=>{if(event.key==='Escape')onClose();}}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#b64f31]">Opt-in booking enquiry</p><h3 id="promoter-introduction-title" className="mt-1 text-xl font-black">Contact {selected.name}</h3></div>
        <button type="button" onClick={onClose} aria-label="Close introduction form" className="rounded-full p-2 hover:bg-black/5"><X size={20}/></button></div>
      <p className="mt-3 text-sm leading-6 text-[#686258]">Your band name, location, genres and saved public social/music links will accompany your message in the promoter's private SceneGen inbox. Personal contact details are not shared.</p>
      {previous?.status==='pending'?<p className="mt-5 rounded-lg bg-[#f3e6d9] p-4 text-sm font-bold">You already have a pending introduction.</p>
        :previous?.status==='declined'?<p className="mt-5 rounded-lg bg-[#f3e6d9] p-4 text-sm font-bold">This promoter has declined further introductions from this band.</p>
        :<><label className="mt-5 block text-sm font-bold" htmlFor="promoter-introduction-message">Booking enquiry</label>
          <textarea id="promoter-introduction-message" autoFocus rows={4} maxLength={500} value={message} onChange={event=>setMessage(event.target.value)}
            placeholder="Introduce your band and explain what type of show or opportunity you want to discuss." className="mt-2 w-full rounded-lg border border-black/20 bg-white p-4 text-sm outline-none focus:border-[#ff5a36]"/>
          <div className="mt-1 text-right text-xs text-[#777168]">{message.trim().length}/500 characters · minimum 30</div>
          <div className="mt-3 rounded-lg border border-black/10 bg-white p-3 text-xs text-[#686258]">
            {linksLoading?'Checking your band links…':validLinks.length>0?<><strong>Automatically included:</strong> {validLinks.map(([network])=>network).join(' · ')} <Link href="/settings?tab=workspace" className="ml-2 underline">Edit links</Link></>
              :<>Add at least one music or social link to your band workspace before sending. <Link href="/settings?tab=workspace" className="font-bold underline">Add band links</Link></>}
          </div>
          <button type="button" onClick={()=>void submit()} disabled={!canSend} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#171713] px-5 text-sm font-bold text-white disabled:opacity-40"><Send size={16}/>{busy?'Sending…':'Send introduction'}</button></>}
    </section>
  </div>;
}
