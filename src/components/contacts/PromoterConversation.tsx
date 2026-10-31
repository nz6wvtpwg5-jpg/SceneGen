'use client';
import {useEffect,useState} from 'react';
import {Send,MessageCircle} from 'lucide-react';

type Message={id:string;body:string;senderEntityId:string;createdAt:string};
export function PromoterConversation({entityId,introductionId}:{entityId:string;introductionId:string}){
  const [messages,setMessages]=useState<Message[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [body,setBody]=useState('');
  const [sending,setSending]=useState(false);
  const url='/api/promoter-outreach/requests/'+encodeURIComponent(introductionId)+'/messages';
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setMessages([]);setError('');setBody('');
    fetch(url,{headers:{'X-Entity-Id':entityId},signal:controller.signal,cache:'no-store'})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Unable to load messages');return data;})
      .then(data=>{if(!controller.signal.aborted)setMessages(Array.isArray(data.messages)?data.messages:[]);})
      .catch(caught=>{if(!controller.signal.aborted)setError(caught instanceof Error?caught.message:'Unable to load messages');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[entityId,introductionId,url]);
  async function reply(){
    if(sending||!body.trim()||body.trim().length>2000)return;
    setSending(true);setError('');
    try{
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Entity-Id':entityId},body:JSON.stringify({body:body.trim()})});
      const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Unable to send reply');
      setMessages(items=>[...items,data.message]);setBody('');
    }catch(caught){setError(caught instanceof Error?caught.message:'Unable to send reply');}
    finally{setSending(false);}
  }
  return <section className="mt-4 rounded-xl border border-black/10 bg-[#f8f2e9] p-4" aria-label="Private booking conversation">
    <div className="flex items-center gap-2 text-sm font-black"><MessageCircle size={16}/> Private conversation</div>
    <p className="mt-1 text-xs text-[#756d61]">Only the two workspaces can see these messages. No private email address is shared.</p>
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
      disabled={loading||Boolean(error&&messages.length===0)} placeholder="Write a private booking reply…"
      className="mt-2 w-full rounded-lg border border-black/15 bg-white p-3 text-sm"/>
    <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-[#756d61]">{body.trim().length}/2000</span>
      <button type="button" onClick={()=>void reply()} disabled={sending||loading||!body.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#171713] px-4 text-xs font-bold text-white disabled:opacity-40"><Send size={14}/>{sending?'Sending…':'Send reply'}</button>
    </div>
  </section>;
}
