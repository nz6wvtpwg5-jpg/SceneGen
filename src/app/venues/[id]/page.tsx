'use client';
import VenuePhoto from '@/components/venues/VenuePhoto';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getEntityId } from '@/lib/entity';
type Venue={id:string;name:string;address:string|null;city:string|null;region:string|null;country:string|null;postalCode:string|null;capacity:number|null;latitude:number|null;longitude:number|null};
export default function VenueProfile() {
  const {id}=useParams<{id:string}>();
  const [venue,setVenue]=useState<Venue|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    const c=new AbortController();const entityId=getEntityId();
    fetch('/api/venues/'+encodeURIComponent(id),{signal:c.signal,headers:entityId?{'X-Entity-Id':entityId}:{}})
      .then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error?.message||'Venue unavailable');return body;})
      .then(body=>setVenue(body.venue)).catch(e=>{if(!c.signal.aborted)setError(e.message);});
    return()=>c.abort();
  },[id]);
  return <main className="scene-page mx-auto max-w-4xl space-y-6 pb-16">
    <Link href="/contacts" className="text-sm font-bold underline">← Contacts</Link>
    {error?<p role="alert" className="rounded-lg border p-5">{error}</p>:!venue?<p>Loading venue…</p>:<>
      <header className="overflow-hidden rounded-xl border border-black/10 bg-[#fffaf2]"><VenuePhoto venueId={venue.id} className="h-64 w-full"/><div className="p-8">
        <p className="scene-kicker">SceneGen venue directory</p>
        <h1 className="scene-title">{venue.name}</h1>
        <p className="mt-3 text-[#686258]">{[venue.city,venue.region,venue.country].filter(Boolean).join(', ')}</p></div>
      </header>
      <section className="rounded-xl border border-black/10 bg-white p-6">
        <h2 className="text-xl font-black">Venue details</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs font-bold uppercase text-[#686258]">Address</dt><dd>{[venue.address,venue.postalCode].filter(Boolean).join(', ')||'Not provided'}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-[#686258]">Capacity</dt><dd>{venue.capacity??'Not provided'}</dd></div>
        </dl>
        <p className="mt-6 text-xs text-[#686258]">Directory details only. Show contracts, contact information, day sheets and private notes remain in each band's workspace.</p>
      </section>
    </>}
  </main>;
}