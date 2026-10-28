'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Pencil, ShieldCheck } from 'lucide-react';

type Sheet = { id: string; showDate: string; venueName?: string; venueCity?: string; venueCountry?: string; workspaceName: string; accessLevel: 'viewer' | 'editor' };

export default function MyDaySheets() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/my-day-sheets', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Day sheets could not be loaded');
        setSheets(data.shows || []);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Day sheets could not be loaded'))
      .finally(() => setLoading(false));
  }, []);

  return <main className="scene-page"><div className="mx-auto max-w-6xl"><p className="scene-kicker">External collaboration</p><h1 className="scene-title">My day sheets</h1><p className="scene-copy">Only the operational dates shared with you appear here.</p>{loading ? <p className="mt-10">Loading…</p> : error ? <div className="mt-10 rounded-3xl border border-[#ff9d8c] bg-[#fff1ec] p-8 text-center"><h2 className="text-xl font-black">Day sheets unavailable</h2><p className="mt-2 text-sm text-[#686258]">{error}</p></div> : !sheets.length ? <div className="mt-10 rounded-3xl border border-[#d8d0c3] bg-[#fffaf2] p-10 text-center"><ShieldCheck className="mx-auto text-[#ff5738]"/><h2 className="mt-3 text-2xl font-black">No day sheets shared yet</h2></div> : <div className="mt-8 grid gap-4 md:grid-cols-2">{sheets.map((sheet) => <Link href={`/shows/${sheet.id}`} key={sheet.id} className="rounded-3xl border border-[#d8d0c3] bg-[#fffaf2] p-6 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between"><p className="text-xs font-black uppercase tracking-[.16em] text-[#ff5738]">{sheet.workspaceName}</p><span className="inline-flex items-center gap-1 rounded-full border border-[#d8d0c3] px-3 py-1 text-xs font-bold">{sheet.accessLevel === 'editor' && <Pencil size={12}/>} {sheet.accessLevel === 'editor' ? 'Can edit' : 'View only'}</span></div><h2 className="mt-4 text-2xl font-black">{sheet.venueName || 'Venue TBC'}</h2><p className="mt-3 flex items-center gap-2 text-sm text-[#686258]"><CalendarDays size={16}/>{new Date(`${sheet.showDate.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p><p className="mt-2 flex items-center gap-2 text-sm text-[#686258]"><MapPin size={16}/>{[sheet.venueCity, sheet.venueCountry].filter(Boolean).join(', ')}</p></Link>)}</div>}</div></main>;
}
