'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock3, Contact, MapPin, ReceiptText, TriangleAlert } from 'lucide-react';
import { loadOfflineShow, offlineIdentity, type OfflineShowSnapshot } from '@/lib/offline-road-pack';

const shown = (value?: string | number | null) => value === undefined || value === null || value === '' ? 'Not set' : String(value);

function OfflineDaySheet() {
  const showId = useSearchParams().get('showId') || '';
  const [snapshot, setSnapshot] = useState<OfflineShowSnapshot | null>(null);
  useEffect(() => {
    const identity = offlineIdentity();
    setSnapshot(identity && showId ? loadOfflineShow(showId, identity.entityId, identity.userId) : null);
  }, [showId]);

  if (!snapshot) return <main className="mobile-safe-top mobile-safe-bottom grid min-h-[100dvh] place-items-center bg-[#f2eee5] p-5"><section className="max-w-md rounded-3xl border border-[#d6cec1] bg-[#fffaf1] p-8 text-center"><TriangleAlert className="mx-auto text-[#ff5a36]"/><h1 className="mt-4 text-2xl font-black">Saved sheet unavailable</h1><p className="mt-2 text-sm text-[#6e675d]">This device does not have a saved copy for the current SceneGen workspace.</p><Link href="/offline" className="mt-6 inline-flex font-black underline">Back to saved sheets</Link></section></main>;

  const { show, savedAt, financialVisible } = snapshot;
  const location = [show.venueCity, show.venueState, show.venueCountry].filter(Boolean).join(', ') || 'Location pending';
  const schedule = [['Load-in', show.loadInTime], ['Soundcheck', show.soundCheckTime], ['Doors', show.doorsTime], ['Stage', show.showTime], ['Finish', show.endTime]];
  return <main className="mobile-safe-top mobile-safe-bottom min-h-[100dvh] bg-[#f2eee5] p-4 text-[#171713] sm:p-10"><div className="mx-auto max-w-4xl"><Link href="/offline" className="inline-flex min-h-11 items-center gap-2 text-sm font-black"><ArrowLeft size={16}/>Saved sheets</Link><div role="status" className="mt-3 flex gap-3 rounded-2xl border border-[#e1a06f] bg-[#fff0df] p-4"><TriangleAlert className="mt-0.5 shrink-0 text-[#c9671c]" size={20}/><div><p className="font-black">Saved copy — not live</p><p className="mt-1 text-xs leading-5 text-[#795633]">Downloaded {new Date(savedAt).toLocaleString()}. Times and locations may have changed since then.</p></div></div>
    <header className="mt-4 rounded-3xl bg-[#171713] p-6 text-white sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ff7756]">Offline day sheet</p><h1 className="mt-3 text-4xl font-black">{show.venueName || (show.showType === 'off_day' ? 'Off day' : show.showType === 'travel_day' ? 'Travel day' : 'Venue TBC')}</h1><p className="mt-3 text-sm text-white/65">{show.showDate?.slice(0, 10) || 'Date not set'} · {location}</p><div className="mt-6 grid grid-cols-5 border-t border-white/15 pt-5">{schedule.map(([label, entry]) => <div key={label} className="border-l border-white/10 px-2 first:border-0 first:pl-0"><p className="text-[8px] font-black uppercase text-white/40">{label}</p><p className="mt-1 font-black">{entry?.slice(0, 5) || '—'}</p></div>)}</div></header>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><section className="rounded-2xl border border-[#d6cec1] bg-[#fffaf1] p-5"><h2 className="flex items-center gap-2 font-black"><MapPin className="text-[#ff5a36]" size={19}/>Venue</h2><p className="mt-4 font-black">{shown(show.venueName)}</p><p className="mt-1 text-sm leading-6 text-[#6e675d]">{shown(show.venueAddress)}<br/>{location}</p></section><section className="rounded-2xl border border-[#d6cec1] bg-[#fffaf1] p-5"><h2 className="flex items-center gap-2 font-black"><Contact className="text-[#ff5a36]" size={19}/>Contact</h2><p className="mt-4 font-black">{shown(show.contactName)}</p>{show.contactPhone && <a href={`tel:${show.contactPhone}`} className="mt-2 block text-sm font-bold underline">{show.contactPhone}</a>}{show.contactEmail && <a href={`mailto:${show.contactEmail}`} className="mt-1 block text-sm font-bold underline">{show.contactEmail}</a>}</section></div>
    {financialVisible && <section className="mt-4 rounded-2xl border border-[#d6cec1] bg-[#fffaf1] p-5"><h2 className="flex items-center gap-2 font-black"><ReceiptText className="text-[#ff5a36]" size={19}/>Commercials</h2><div className="mt-4 grid grid-cols-2 gap-4 text-sm"><p><span className="block text-xs text-[#7c756b]">Guarantee</span><strong>{show.guarantee == null ? 'Not set' : `${show.guarantee.toLocaleString()} ${show.currency || ''}`}</strong></p><p><span className="block text-xs text-[#7c756b]">Deal</span><strong>{shown(show.dealType?.replaceAll('_', ' '))}</strong></p></div></section>}
    {show.notes && <section className="mt-4 rounded-2xl border border-[#d6cec1] bg-[#fffaf1] p-5"><h2 className="flex items-center gap-2 font-black"><Clock3 className="text-[#ff5a36]" size={19}/>Notes</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#5e584f]">{show.notes}</p></section>}</div></main>;
}

export default function OfflineDaySheetPage() {
  return <Suspense fallback={<main className="min-h-[100dvh] bg-[#f2eee5]"/>}><OfflineDaySheet/></Suspense>;
}
