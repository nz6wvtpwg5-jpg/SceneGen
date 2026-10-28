'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getEntityId } from '@/lib/entity';
import { useProfileStore } from '@/store/useProfileStore';
type Artist = { id:string; name:string; city?:string|null; country?:string|null; tags?:string[] };
export default function PromoterNetworkPage() {
  const profile=useProfileStore(s=>s.activeProfile);
  const [q,setQ]=useState('');
  const [results,setResults]=useState<Artist[]>([]);
  const [error,setError]=useState('');
  useEffect(()=>{
    if(profile?.entityType!=='promoter'||q.trim().length<2){setResults([]);return;}
    const c=new AbortController(), timer=window.setTimeout(()=>{
      fetch('/api/promoter-network/artists?q='+encodeURIComponent(q.trim()),{
        headers:{'X-Entity-Id':getEntityId()||profile.id},signal:c.signal,cache:'no-store'
      }).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Search unavailable');return data;})
      .then(data=>{if(!c.signal.aborted){setResults(Array.isArray(data.artists)?data.artists:[]);setError('');}})
      .catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'Search unavailable');});
    },300);
    return ()=>{c.abort();clearTimeout(timer);};
  },[q,profile?.id,profile?.entityType]);
  if(profile?.entityType!=='promoter')return <main className="scene-page">Select your promoter workspace to find bands.</main>;
  return <main className="scene-page space-y-5">
    <header><p className="scene-kicker">Promoter network</p><h1 className="scene-title">Find bands</h1><p className="scene-copy">Search registered artists by name or genre, then arrange shows in your own workspace.</p></header>
    <input aria-label="Search bands" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search band name or genre" className="h-12 w-full max-w-xl rounded-md border border-black/15 bg-white px-4" />
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="grid max-w-2xl gap-3">{results.map(a=><article key={a.id} className="rounded-lg border border-black/10 bg-white p-5"><Link href={'/profile/'+encodeURIComponent(a.id)} className="font-black underline">{a.name}</Link><p className="text-sm text-[#6d685f]">{[a.city,a.country].filter(Boolean).join(', ')}</p><div className="mt-2 flex flex-wrap gap-2">{(a.tags||[]).map(tag=><span key={tag} className="rounded-full bg-[#eee6da] px-2 py-1 text-xs">{tag}</span>)}</div></article>)}</div>
    <Link href="/shows?create=show" className="inline-flex rounded-full bg-[#171713] px-6 py-3 font-bold text-white">Create a show in my promoter workspace</Link>
    <p className="text-sm text-[#6d685f]">Creating a show in your workspace does not grant access to an artist's private calendar. Band-side booking approval requires a separate invitation or agreement.</p>
  </main>;
}
