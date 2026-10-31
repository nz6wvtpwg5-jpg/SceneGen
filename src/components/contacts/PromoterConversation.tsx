'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {RefreshCw,Send,MessageCircle} from 'lucide-react';

type Message={id:string;body:string;senderEntityId:string;createdAt:string};
const REFRESH_INTERVAL_MS=30000;
export function PromoterConversation({entityId,introductionId,onRead}:{entityId:string;introductionId:string;onRead?:()=>void}){
  const [messages,setMessages]=useState<Message[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState('');
  const [body,setBody]=useState('');
  const [sending,setSending]=useState(false);
  const busyRef=useRef(false);
  const onReadRef=useRef(onRead);
  const lastMarkedRef=useRef<string|null>(null);
  const activeRef=useRef({entityId,introductionId});
  activeRef.current={entityId,introductionId};
  onReadRef.current=onRead;
  busyRef.current=Boolean(sending||loading||refreshing);
  const url='/api/promoter-outreach/requests/'+encodeURIComponent(introductionId)+'/messages';
  const isCurrent=useCallback((entity:string,id:string)=>activeRef.current.entityId===entity && activeRef.current.introductionId===id,[]);
  const load=useCallback(async(signal?:AbortSignal,quiet=false)=>{
    if(!quiet)setLoading(true);
    else setRefreshing(true);
    try{
      const response=await fetch(url,{headers:{'X-Entity-Id':entityId},signal,cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error?.message||'Unable to load messages');
      if(!signal?.aborted && isCurrent(entityId,introductionId)){
        setMessages(Array.isArray(data.messages)?data.messages:[]);
        setError('');
        // Don't write on every poll. Only acknowledge a new latest message,
        // and never update the new workspace from an old request's response.
        const incoming=Array.isArray(data.messages)?data.messages:[];
        const fingerprint=entityId+':'+introductionId+':'+(incoming.at(-1)?.id||'empty');
        if(incoming.length>0 && lastMarkedRef.current!==fingerprint){
          lastMarkedRef.current=fingerprint;
          void fetch('/api/promoter-outreach/requests/'+encodeURIComponent(introductionId)+'/read',{method:'POST',headers:{'X-Entity-Id':entityId,'Content-Type':'application/json'},body:JSON.stringify({lastSeenMessageId:incoming.at(-1)!.id})})
            .then(response=>{if(response.ok && !signal?.aborted && isCurrent(entityId,introductionId))onReadRef.current?.();
              if(!response.ok)lastMarkedRef.current=null;})
            .catch(()=>{lastMarkedRef.current=null;});
        }
      }
    }catch(caught){
      if(!signal?.aborted && isCurrent(entityId,introductionId))setError(caught instanceof Error?caught.message:'Unable to load messages');
    }finally{
      if(!signal?.aborted && isCurrent(entityId,introductionId)){
        setLoading(false);setRefreshing(false);
      }
    }
  },[entityId,introductionId,url,isCurrent]);
  useEffect(()=>{
    const controller=new AbortController();
    setMessages([]);setError('');setBody('');setLoading(true);
    void load(controller.signal);
    return()=>controller.abort();
  },[load]);
  useEffect(()=>{
    // Background refresh only while this conversation is mounted.
    const controller=new AbortController();
    const interval=setInterval(()=>{
      if(!controller.signal.aborted && !busyRef.current)void load(controller.signal,true);
    },REFRESH_INTERVAL_MS);
    return()=>{controller.abort();clearInterval(interval);};
  },[load]);
  async function reply(){
    if(sending||loading||!body.trim()||body.trim().length>2000)return;
    const requestEntity=entityId,requestIntroduction=introductionId;
    setSending(true);setError('');
    try{
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Entity-Id':entityId},body:JSON.stringify({body:body.trim()})});
      const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Unable to send reply');
      if(isCurrent(requestEntity,requestIntroduction)){
        setMessages(items=>[...items,data.message]);setBody('');
      }
    }catch(caught){if(isCurrent(requestEntity,requestIntroduction))setError(caught instanceof Error?caught.message:'Unable to send reply');}
    finally{if(isCurrent(requestEntity,requestIntroduction))setSending(false);}
  }
  return <section className="mt-4 rounded-xl border border-black/10 bg-[#f8f2e9] p-4" aria-label="Private booking conversation">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-black"><MessageCircle size={16}/> Private conversation</div>
      <button type="button" onClick={()=>void load(undefined,true)} disabled={loading||refreshing||sending}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/15 bg-white px-3 text-xs font-bold disabled:opacity-40">
        <RefreshCw size={14}/>{refreshing?'Refreshing…':'Refresh replies'}</button></div>
    <p className="mt-1 text-xs text-[#756d61]">Only the two workspaces can see these messages. No private email address is shared. Replies refresh every 30 seconds.</p>
    {loading?<p className="mt-4 text-sm text-[#756d61]">Loading replies…</p>:<div className="mt-4 max-h-80 space-y-3 overflow-y-auto" aria-live="polite">
      {messages.length===0&&<p className="text-sm text-[#756d61]">Introduction accepted. You can now discuss the opportunity.</p>}
      {messages.map(message=><div key={message.id} className={`max-w-[90%] rounded-lg p-3 text-sm ${message.senderEntityId===entityId?'ml-auto bg-[#171713] text-white':'bg-white text-[#171713]'}`}>
        <p className="mb-1 text-[10px] font-bold opacity-65">{message.senderEntityId===entityId?'Your workspace':'Other workspace'}</p>
        <p className="whitespace-pre-wrap break-words leading-6">{message.body}</p>
      </div>)}
    </div>}
    {error&&<p className="mt-3 text-xs text-red-700" role="alert">{error}</p>}
    <label htmlFor={'reply-'+introductionId} className="mt-4 block text-xs font-bold">Reply</label>
    <textarea id={'reply-'+introductionId} value={body} onChange={event=>setBody(event.target.value)} maxLength={2000} rows={3}
      disabled={loading} placeholder="Write a private booking reply…"
      className="mt-2 w-full rounded-lg border border-black/15 bg-white p-3 text-sm"/>
    <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-[#756d61]">{body.trim().length}/2000</span>
      <button type="button" onClick={()=>void reply()} disabled={sending||loading||!body.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#171713] px-4 text-xs font-bold text-white disabled:opacity-40"><Send size={14}/>{sending?'Sending…':'Send reply'}</button>
    </div>
  </section>;
}
