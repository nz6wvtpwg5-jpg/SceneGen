'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {Check,Inbox,MessageCircle,RefreshCw,Send,ShieldCheck,X} from 'lucide-react';
import {useProfileStore} from '@/store/useProfileStore';
import {PromoterConversation} from '@/components/contacts/PromoterConversation';

type Introduction={
  id:string;message:string;status:'pending'|'accepted'|'declined';createdAt:string;
  artistName?:string;artistCity?:string|null;artistCountry?:string|null;artistGenres?:string[];artistLinks?:Record<string,string>;promoterName?:string;lastMessage?:string|null;lastMessageAt?:string|null;unread?:boolean;
};
type View='inbox'|'requests';

export function MessagesCenter(){
  const {activeProfile}=useProfileStore();
  const params=useSearchParams();
  const workspaceId=activeProfile?.id;
  const role=activeProfile?.membershipRole;
  const isPromoter=activeProfile?.entityType?.toLowerCase()==='promoter';
  const canMessage=Boolean(workspaceId && ['owner','admin'].includes(role||''));
  const [view,setView]=useState<View>(params.get('tab')==='requests'?'requests':'inbox');
  const activeWorkspaceRef=useRef(workspaceId);
  const latestLoadRef=useRef(0);
  activeWorkspaceRef.current=workspaceId;
  const [items,setItems]=useState<Introduction[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [processing,setProcessing]=useState<string|null>(null);
  const [refreshing,setRefreshing]=useState(false);
  const preferredThread=params.get('thread');

  const load=useCallback(async(quiet=false,signal?:AbortSignal)=>{
    if(!workspaceId||!canMessage)return;
    const loadId=++latestLoadRef.current;
    if(!quiet)setLoading(true);else setRefreshing(true);
    try{
      const response=await fetch(isPromoter?'/api/promoter-outreach/inbox':'/api/promoter-outreach/sent',{
        headers:{'X-Entity-Id':workspaceId},cache:'no-store',signal,
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error?.message||'Unable to load messages');
      if(!signal?.aborted && latestLoadRef.current===loadId && activeWorkspaceRef.current===workspaceId){setItems(Array.isArray(result.requests)?result.requests:[]);setError('');}
    }catch(caught){if(!signal?.aborted && latestLoadRef.current===loadId && activeWorkspaceRef.current===workspaceId)setError(caught instanceof Error?caught.message:'Unable to load messages');}
    finally{if(!signal?.aborted && latestLoadRef.current===loadId && activeWorkspaceRef.current===workspaceId){setLoading(false);setRefreshing(false);}}
  },[workspaceId,canMessage,isPromoter]);
  useEffect(()=>{
    const controller=new AbortController();
    setItems([]);setSelected(null);setLoading(true);setError('');
    if(canMessage)void load(false,controller.signal);
    else setLoading(false);
    return()=>controller.abort();
  },[load,canMessage]);
  useEffect(()=>{
    if(!canMessage)return;
    const controller=new AbortController();
    const timer=setInterval(()=>{if(!controller.signal.aborted&&!processing)void load(true,controller.signal);},30000);
    return()=>{controller.abort();clearInterval(timer);};
  },[load,canMessage,processing]);
  const accepted=useMemo(()=>items.filter(item=>item.status==='accepted'),[items]);
  const requests=useMemo(()=>items.filter(item=>item.status!=='accepted'),[items]);
  const displayed=view==='inbox'?accepted:requests;
  useEffect(()=>{
    if(preferredThread && accepted.some(item=>item.id===preferredThread)){
      setView('inbox');setSelected(preferredThread);
    }
  },[preferredThread,accepted]);
  useEffect(()=>{
    if(selected && !displayed.some(item=>item.id===selected))setSelected(null);
  },[displayed,selected]);
  const current=displayed.find(item=>item.id===selected);
  const unread=accepted.filter(item=>item.unread).length;
  const pendingRequests=requests.filter(item=>item.status==='pending').length;

  async function respond(id:string,status:'accepted'|'declined'){
    if(!workspaceId||processing)return;
    setProcessing(id);setError('');
    try{
      const response=await fetch('/api/promoter-outreach/requests/'+encodeURIComponent(id),{
        method:'PATCH',headers:{'X-Entity-Id':workspaceId,'Content-Type':'application/json'},
        body:JSON.stringify({status}),
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error?.message||'Unable to respond');
      if(activeWorkspaceRef.current!==workspaceId)return;
      setItems(existing=>existing.map(item=>item.id===id?{...item,status}:item));
      if(status==='accepted'){setView('inbox');setSelected(id);}
    }catch(caught){if(activeWorkspaceRef.current===workspaceId)setError(caught instanceof Error?caught.message:'Unable to respond');}
    finally{if(activeWorkspaceRef.current===workspaceId)setProcessing(null);}
  }
  function select(item:Introduction){
    // Keep the unread badge until the conversation confirms a successful read.
    setSelected(item.id);
  }
  if(!workspaceId)return <p className="rounded-xl border border-black/10 bg-white p-6 text-sm">Choose a workspace to view messages.</p>;
  if(!canMessage)return <p className="rounded-xl border border-black/10 bg-white p-6 text-sm">Messages are available to workspace owners and administrators.</p>;

  return <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#fffaf2] shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 px-5 py-5 sm:px-7">
      <div><h2 className="text-2xl font-black">Messages</h2><p className="mt-1 text-xs text-[#756d61]">Booking conversations for {activeProfile?.name}</p></div>
      <button type="button" onClick={()=>void load(true)} disabled={loading||refreshing} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/15 bg-white px-4 text-xs font-bold disabled:opacity-50"><RefreshCw size={14}/>{refreshing?'Refreshing…':'Refresh'}</button>
    </div>
    <div className="flex flex-wrap gap-2 border-b border-black/10 bg-[#f7f1e7] p-3 sm:px-6" role="tablist" aria-label="Message sections">
      <button role="tab" type="button" aria-selected={view==='inbox'} onClick={()=>{setView('inbox');setSelected(null);}} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold ${view==='inbox'?'bg-[#171713] text-white':'bg-white text-[#554e44]'}`}><Inbox size={16}/> Inbox {unread>0&&<span className="rounded-full bg-[#ff5a36] px-2 text-xs text-white">{unread}</span>}</button>
      <button role="tab" type="button" aria-selected={view==='requests'} onClick={()=>{setView('requests');setSelected(null);}} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold ${view==='requests'?'bg-[#171713] text-white':'bg-white text-[#554e44]'}`}><MessageCircle size={16}/> {isPromoter?'Message requests':'Sent requests'} {pendingRequests>0&&<span className="rounded-full bg-[#ff5a36] px-2 text-xs text-white">{pendingRequests}</span>}</button>
    </div>
    {error&&<p className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
    <div className="grid min-h-[440px] md:grid-cols-[minmax(245px,320px)_minmax(0,1fr)]">
      <aside className="border-b border-black/10 md:border-b-0 md:border-r" aria-label="Conversation list">
        {loading?<p className="p-6 text-sm text-[#756d61]">Loading conversations…</p>:displayed.length===0?<div className="p-6 text-sm leading-6 text-[#756d61]">{view==='inbox'?'No conversations yet. Once a promoter accepts a booking introduction, it appears here.':isPromoter?'No message requests yet. Bands can send an introduction when you enable requests under Workspace settings.':'You haven’t sent a booking introduction yet.'}</div>
        :<div className="max-h-[65dvh] overflow-y-auto">{displayed.map(item=><button type="button" key={item.id} onClick={()=>select(item)} aria-pressed={selected===item.id} className={`flex w-full min-h-24 flex-col border-b border-black/10 px-5 py-4 text-left transition ${selected===item.id?'bg-[#f1e5d7]':'hover:bg-[#f8f1e9]'}`}>
          <span className="flex w-full items-center justify-between gap-2"><strong className="truncate text-sm">{isPromoter?item.artistName:item.promoterName}</strong><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold capitalize ${item.status==='accepted'?'bg-[#e5efdf] text-[#456544]':'bg-[#ebe4d9] text-[#766a5c]'}`}>{item.status}</span></span>
          <span className="mt-2 line-clamp-2 text-xs leading-5 text-[#686258]">{item.lastMessage||item.message}</span>
          {item.unread&&<span className="mt-2 inline-flex w-fit rounded-full bg-[#ff5a36] px-2 py-0.5 text-[10px] font-black text-white">New reply</span>}
        </button>)}</div>}
      </aside>
      <section className="min-w-0 p-5 sm:p-7" aria-label="Selected conversation">
        {!current?<div className="flex min-h-[300px] flex-col items-center justify-center text-center"><MessageCircle className="text-[#c0ae9a]" size={42}/><h3 className="mt-4 text-lg font-black">Select a conversation</h3><p className="mt-2 max-w-xs text-sm text-[#756d61]">Choose a message on the left to read it or respond.</p>{!isPromoter&&<Link href="/contacts/discover" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#171713] px-5 text-sm font-bold text-white">Discover promoters</Link>}{isPromoter&&<Link href="/settings?tab=workspace" className="mt-5 text-sm font-bold underline">Introduction settings</Link>}</div>
        :<><div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#a05b41]">{current.status==='accepted'?'Booking conversation':'Booking introduction'}</p><h3 className="mt-1 text-xl font-black">{isPromoter?current.artistName:current.promoterName}</h3></div><span className="text-xs font-bold capitalize text-[#756d61]">{current.status}</span></div>
          {isPromoter&&<div className="mt-4 rounded-lg border border-black/10 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#887b6d]">About the band</p>
            {(current.artistCity||current.artistCountry)&&<p className="mt-2 text-sm">{[current.artistCity,current.artistCountry].filter(Boolean).join(', ')}</p>}
            {Boolean(current.artistGenres?.length)&&<p className="mt-1 text-sm">{current.artistGenres?.join(' · ')}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(current.artistLinks||{}).map(([network,url])=><a key={network} href={url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-black/15 px-3 py-2 text-xs font-bold capitalize underline">{network}</a>)}
            </div>
          </div>}
          <div className="mt-5 rounded-lg bg-[#f3e9dd] p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#887b6d]">Original enquiry</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{current.message}</p></div>
          {current.status==='accepted'?<PromoterConversation key={`${workspaceId}-${current.id}`} entityId={workspaceId} introductionId={current.id} onRead={()=>{if(activeWorkspaceRef.current===workspaceId)setItems(existing=>existing.map(item=>item.id===current.id?{...item,unread:false}:item));}}/>:
            current.status==='pending'&&isPromoter?<div className="mt-5"><p className="text-sm text-[#686258]">Accept to open a private conversation, or decline the request. No contact information is shared.</p><div className="mt-4 flex gap-3"><button type="button" disabled={Boolean(processing)} onClick={()=>void respond(current.id,'accepted')} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#171713] px-5 text-sm font-bold text-white disabled:opacity-50"><Check size={16}/> Accept</button><button type="button" disabled={Boolean(processing)} onClick={()=>void respond(current.id,'declined')} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-bold disabled:opacity-50"><X size={16}/> Decline</button></div></div>
            :<p className="mt-5 inline-flex items-center gap-2 text-sm text-[#766b5e]"><ShieldCheck size={16}/>{current.status==='declined'?'This introduction was declined. Replies are disabled.':'Waiting for the promoter to respond. Replies open only after acceptance.'}</p>}
        </>}
      </section>
    </div>
  </div>;
}
