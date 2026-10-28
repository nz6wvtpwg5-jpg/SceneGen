'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CloudOff, MapPin, RefreshCw } from 'lucide-react';
import { listOfflineShows, offlineIdentity, type OfflineShowSnapshot } from '@/lib/offline-road-pack';

export default function OfflinePage() {
  const [snapshots, setSnapshots] = useState<OfflineShowSnapshot[]>([]);
  const load = useCallback(() => {
    const identity = offlineIdentity();
    setSnapshots(identity ? listOfflineShows(identity.entityId, identity.userId) : []);
  }, []);
  useEffect(() => {
    load();
    window.addEventListener('scenegen:road-pack-updated', load);
    return () => window.removeEventListener('scenegen:road-pack-updated', load);
  }, [load]);

  return <main className="mobile-safe-top mobile-safe-bottom min-h-[100dvh] bg-[#f2eee5] p-5 text-[#171713] sm:p-10"><section className="mx-auto max-w-3xl"><CloudOff className="h-8 w-8 text-[#ff5a36]" /><p className="mt-6 text-[10px] font-black uppercase tracking-[.2em] text-[#ff5a36]">SceneGen road mode</p><h1 className="mt-2 text-4xl font-black tracking-[-.04em]">No signal right now.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[#6e675d]">These are saved copies, not live information. Check the saved time on the sheet and refresh it when your connection returns.</p>
    {snapshots.length ? <div className="mt-8 grid gap-3">{snapshots.map(({ show, savedAt }) => <Link key={show.id} href={`/offline/day-sheet?showId=${encodeURIComponent(show.id)}`} className="rounded-2xl border border-[#d6cec1] bg-[#fffaf1] p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">{show.venueName || (show.showType === 'off_day' ? 'Off day' : show.showType === 'travel_day' ? 'Travel day' : 'Venue TBC')}</h2><p className="mt-2 flex items-center gap-2 text-sm text-[#6e675d]"><CalendarDays size={15}/>{show.showDate?.slice(0, 10) || 'Date not set'}</p><p className="mt-1 flex items-center gap-2 text-sm text-[#6e675d]"><MapPin size={15}/>{[show.venueCity, show.venueCountry].filter(Boolean).join(', ') || 'Location pending'}</p></div><span className="shrink-0 text-right text-[10px] font-bold text-[#8a8277]">Saved<br/>{new Date(savedAt).toLocaleString()}</span></div></Link>)}</div> : <div className="mt-8 rounded-[26px] border border-[#d6cec1] bg-[#fffaf1] p-7"><h2 className="text-xl font-black">No saved day sheets</h2><p className="mt-2 text-sm leading-6 text-[#6e675d]">SceneGen automatically prepares upcoming day sheets while you are signed in and online. Reopen the app when you have a connection to prepare the road pack.</p></div>}
    <Link href="/dashboard" className="mt-7 flex min-h-12 w-fit items-center justify-center gap-2 rounded-full bg-[#171713] px-6 text-sm font-black text-white"><RefreshCw className="h-4 w-4" />Try SceneGen again</Link></section></main>;
}
