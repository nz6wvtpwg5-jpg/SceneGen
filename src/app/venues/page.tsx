'use client';
import VenuePhoto from '@/components/venues/VenuePhoto';
import {useState} from 'react';
import Link from 'next/link';
import {getEntityId} from '@/lib/entity';
type Venue={id:string;name:string;city:string|null;country:string|null;capacity:number|null;address:string|null};
export default function VenueDirectory(){
 const [query,setQuery]=useState('');const [rows,setRows]=useState<Venue[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function search(e:React.FormEvent){e.preventDefault();if(query.trim().length<2)return;setBusy(true);setError('');
  try {const entityId=getEntityId();const response=await fetch('/api/venues?query='+encodeURIComponent(query.trim()),{headers:entityId?{'X-Entity-Id':entityId}:{},cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error?.message||'Venue lookup failed');setRows(result.venues||[]);}catch(e){setError(e instanceof Error?e.message:'Unable to search venues');}finally{setBusy(false);}
 }
 return <main className="scene-page mx-auto max-w-4xl space-y-6 pb-16">
 <header><p className="scene-kicker">SceneGen venue directory</p><h1 className="scene-title">Venues</h1><p className="scene-copy">Look up factual venue details shared across SceneGen. Private show information remains private.</p></header>
 <form onSubmit={search} className="flex gap-2"><input className="h-12 min-w-0 flex-1 rounded-lg border bg-white px-4" aria-label="Venue name or address" placeholder="Find a venue by name or address" value={query} onChange={e=>setQuery(e.target.value)}/><button disabled={busy||query.trim().length<2} className="rounded-full bg-[#171713] px-5 text-sm font-bold text-white disabled:opacity-50">{busy?'Searching…':'Search'}</button></form>
 {error&&<p role="alert" className="text-red-700">{error}</p>}
 <div className="grid gap-3">{rows.map(v=><Link key={v.id} href={'/venues/'+v.id} className="rounded-xl border bg-[#fffaf2] p-5 hover:border-[#ff5a36]"><div className="flex items-center gap-4"><VenuePhoto venueId={v.id} className="h-20 w-24 shrink-0 rounded-lg"/><div><strong className="block">{v.name}</strong><span className="text-sm text-[#686258]">{[v.city,v.country].filter(Boolean).join(', ')}{v.capacity!==null?' · Capacity '+v.capacity:''}</span></div></div></Link>)}</div>
 </main>;
}
