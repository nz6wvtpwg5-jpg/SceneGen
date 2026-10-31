'use client';
import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import {Send,X} from 'lucide-react';

type SentRequest={id:string;promoterId:string;status:'pending'|'accepted'|'declined'};
const SOCIAL_FIELDS=[
  {key:'facebook',label:'Facebook',placeholder:'https://www.facebook.com/yourband'},
  {key:'instagram',label:'Instagram',placeholder:'https://www.instagram.com/yourband'},
  {key:'bandcamp',label:'Bandcamp',placeholder:'https://yourband.bandcamp.com'},
  {key:'spotify',label:'Spotify',placeholder:'https://open.spotify.com/artist/...'},
] as const;

export function PromoterIntroductionComposer({entityId,selected,onClose}:{entityId:string;selected:{id:string;name:string}|null;onClose:()=>void}){
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState<SentRequest[]>([]);
  const [links,setLinks]=useState<Record<string,string>>({});
  const [savedLinks,setSavedLinks]=useState<Record<string,string>>({});
  const [linksError,setLinksError]=useState('');
  const [linksLoadError,setLinksLoadError]=useState('');
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
    const controller=new AbortController();setLinksLoading(true);setLinks({});setSavedLinks({});setLinksError('');setLinksLoadError('');
    fetch('/api/promoter-outreach/sender-links',{headers:{'X-Entity-Id':entityId},signal:controller.signal,cache:'no-store'})
      .then(async response=>response.ok?response.json():Promise.reject(new Error('Unable to load band links')))
      .then(data=>{if(!controller.signal.aborted){setLinks(data.socialLinks||{});setSavedLinks(data.socialLinks||{});}})
      .catch(()=>{if(!controller.signal.aborted)setLinksLoadError("Unable to load your band's saved links. Close and reopen this window to retry.");}).finally(()=>{if(!controller.signal.aborted)setLinksLoading(false);});
    return()=>controller.abort();
  },[entityId]);
  const linksModified=SOCIAL_FIELDS.some(field=>(links[field.key]||'').trim()!==(savedLinks[field.key]||'').trim());
  const hasSavedLink=SOCIAL_FIELDS.some(field=>Boolean(savedLinks[field.key]));
  const linkError=SOCIAL_FIELDS.find(field=>{
    const value=(links[field.key]||'').trim();
    if(!value)return false;
    try{
      const url=new URL(value);
      const host=url.hostname.toLowerCase();
      const validHost=field.key==='bandcamp'
        ?(host==='bandcamp.com'||host.endsWith('.bandcamp.com'))
        :field.key==='facebook' ? ['facebook.com','www.facebook.com','m.facebook.com','fb.com','www.fb.com'].includes(host)
        :field.key==='instagram' ? ['instagram.com','www.instagram.com'].includes(host)
        :host==='open.spotify.com';
      return url.protocol!=='https:'||!validHost||Boolean(url.username||url.password);
    }catch{return true;}
  });
  const linksValid=!linkError&&SOCIAL_FIELDS.some(field=>Boolean((links[field.key]||'').trim()));
  if(!selected)return null;
  const promoterId=selected.id;
  const previous=sent.find(item=>item.promoterId===promoterId);
  const canSend=message.trim().length>=30&&message.trim().length<=500&&!linksLoading&&!linksLoadError&&linksValid&&!busy&&previous?.status!=='pending'&&previous?.status!=='declined';
  async function saveLinks(){
    const update=Object.fromEntries(SOCIAL_FIELDS.map(field=>[field.key,(links[field.key]||'').trim()]));
    const response=await fetch('/api/promoter-outreach/sender-links',{
      method:'PUT',headers:{'Content-Type':'application/json','X-Entity-Id':entityId},
      body:JSON.stringify({socialLinks:update})
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error?.message||'Unable to save band links');
    setSavedLinks(data.socialLinks||{});setLinks(data.socialLinks||{});setLinksError('');
  }
  async function submit(){
    if(!canSend)return;setBusy(true);setLinksError('');
    try{
      if(linksModified || !hasSavedLink) await saveLinks();
      const response=await fetch('/api/promoter-outreach/requests',{method:'POST',headers:{'Content-Type':'application/json','X-Entity-Id':entityId},body:JSON.stringify({promoterId,message:message.trim()})});
      const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Unable to send introduction');
      setSent(items=>[{id:data.id,promoterId,status:'pending'},...items]);
      toast.success('Introduction sent. Track it in Messages → Sent requests.');setMessage('');onClose();
     }catch(error){const detail=error instanceof Error?error.message:'Unable to send introduction';setLinksError(detail);toast.error(detail);}finally{setBusy(false);}
  }
  return <div role="presentation" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section role="dialog" aria-modal="true" aria-labelledby="promoter-introduction-title" className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-[#fffaf2] p-6 shadow-xl sm:p-8" onKeyDown={event=>{if(event.key==='Escape')onClose();}}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#b64f31]">Opt-in booking enquiry</p><h3 id="promoter-introduction-title" className="mt-1 text-xl font-black">Contact {selected.name}</h3></div>
        <button type="button" onClick={onClose} aria-label="Close introduction form" className="rounded-full p-2 hover:bg-black/5"><X size={20}/></button></div>
      <p className="mt-3 text-sm leading-6 text-[#686258]">Your band name, location, genres and saved public social/music links will accompany your message in the promoter's private SceneGen inbox. Personal contact details are not shared.</p>
      {previous?.status==='pending'?<p className="mt-5 rounded-lg bg-[#f3e6d9] p-4 text-sm font-bold">You already have a pending introduction.</p>
        :previous?.status==='declined'?<p className="mt-5 rounded-lg bg-[#f3e6d9] p-4 text-sm font-bold">This promoter has declined further introductions from this band.</p>
        :<><label className="mt-5 block text-sm font-bold" htmlFor="promoter-introduction-message">Booking enquiry</label>
          <textarea id="promoter-introduction-message" autoFocus rows={4} maxLength={500} value={message} onChange={event=>setMessage(event.target.value)}
            placeholder="Introduce your band and explain what type of show or opportunity you want to discuss." className="mt-2 w-full rounded-lg border border-black/20 bg-white p-4 text-sm outline-none focus:border-[#ff5a36]"/>
          <div className="mt-1 text-right text-xs text-[#777168]">{message.trim().length}/500 characters · minimum 30</div>
          <div className="mt-4 rounded-lg border border-black/10 bg-white p-4">
            <p className="text-sm font-bold">Your band's social and music links</p>
            <p className="mt-1 text-xs leading-5 text-[#686258]">These four platforms are requested specifically. Add the ones your band uses (at least one); SceneGen saves them and automatically includes them with booking enquiries.</p>
            {linksLoading?<p className="mt-3 text-sm">Loading saved links…</p>:<div className="mt-3 grid gap-3 sm:grid-cols-2">
              {SOCIAL_FIELDS.map(field=><label key={field.key} className="block text-xs font-semibold" htmlFor={'band-'+field.key}>{field.label}
                <input id={'band-'+field.key} type="url" autoComplete="url" value={links[field.key]||''} maxLength={1000} placeholder={field.placeholder}
                  onChange={event=>setLinks(current=>({...current,[field.key]:event.target.value}))}
                  className="mt-1 block w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#ff5a36]"/>
              </label>)}
            </div>}
            {linksLoadError&&<p role="alert" className="mt-2 text-xs text-red-700">{linksLoadError}</p>}
            {linkError&&<p role="alert" className="mt-2 text-xs text-red-700">Please enter a valid HTTPS {linkError.label} URL.</p>}
            {!linksLoading&&!linksValid&&!linkError&&<p className="mt-2 text-xs text-[#a24627]">Add at least one of these four links before sending.</p>}
            {linksError&&<p role="alert" className="mt-2 text-xs text-red-700">{linksError}</p>}
          </div>
          <button type="button" onClick={()=>void submit()} disabled={!canSend} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#171713] px-5 text-sm font-bold text-white disabled:opacity-40"><Send size={16}/>{busy?'Sending…':'Send introduction'}</button></>}
    </section>
  </div>;
}
