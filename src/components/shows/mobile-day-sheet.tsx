'use client';

import {
  ArrowLeft, ChevronDown, CircleAlert, CloudDownload, FileText, Mail,
  MapPin, Navigation, Pencil, Phone, Printer, ReceiptText, Share2,
  RefreshCw, TriangleAlert,
} from 'lucide-react';
import type { Show } from '@/types/show';

type Props = {
  show: Show;
  missing: string[];
  timingIssues: string[];
  financialVisible: boolean;
  canEdit: boolean;
  canShare: boolean;
  onBack: () => void;
  onEdit: () => void;
  onShare: () => void;
  onPrint: () => void;
  offlineSavedAt: string | null;
  offlineCopy: boolean;
  online: boolean;
  refreshingOffline: boolean;
  onRefreshOffline: () => void;
};

const value = (input?: string | number | null) => input === undefined || input === null || input === '' ? 'Not set' : String(input);
const clock = (input?: string) => input ? input.slice(0, 5) : '—';
const date = (input?: string) => {
  const key = input?.slice(0, 10);
  const parsed = key ? new Date(`${key}T12:00:00`) : null;
  return !parsed || Number.isNaN(parsed.getTime()) ? 'Date not set' : new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(parsed);
};
const money = (amount?: number, currency?: string) => {
  if (amount === undefined || amount === null) return 'Not set';
  if (!currency) return `${amount.toLocaleString()} (currency not set)`;
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency}`; }
};

export function MobileDaySheet({ show, missing, timingIssues, financialVisible, canEdit, canShare, onBack, onEdit, onShare, onPrint, offlineSavedAt, offlineCopy, online, refreshingOffline, onRefreshOffline }: Props) {
  const itineraryDay = show.showType === 'off_day' || show.showType === 'travel_day';
  const place = [show.venueCity, show.venueState, show.venueCountry].filter(Boolean).join(', ') || 'Location pending';
  const destination = show.venueAddress || [show.venueName, show.venueCity, show.venueState, show.venueCountry].filter(Boolean).join(', ');
  const schedule = [
    ['Load-in', show.loadInTime], ['Soundcheck', show.soundCheckTime], ['Doors', show.doorsTime],
    ['Stage', show.showTime], ['Finish', show.endTime],
  ];
  const needsAttention = missing.length > 0 || timingIssues.length > 0;

  return (
    <div className="mb-6 sm:hidden">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex min-h-12 items-center gap-2 text-sm font-black"><ArrowLeft className="h-4 w-4" />Shows</button>
        <span className="rounded-full border border-[#cfc6b8] bg-[#fffaf1] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em]">{show.status.replaceAll('_', ' ')}</span>
      </div>

      <section className="mt-2 overflow-hidden rounded-[24px] bg-[#171713] text-white shadow-[0_16px_38px_rgba(23,23,19,.17)]">
        <div className="p-5">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#ff7756]">{itineraryDay ? 'Tour itinerary' : 'Live operations'}</p>
          <h1 className="mt-3 text-[30px] font-black leading-[1.02] tracking-[-.04em]">{itineraryDay ? (show.showType === 'off_day' ? 'Off day' : 'Travel day') : show.festivalName || show.venueName || 'Venue TBC'}</h1>
          {show.festivalName && show.venueName && <p className="mt-2 text-sm font-bold text-white/65">{show.venueName}</p>}
          <p className="mt-3 text-sm font-bold text-white/75">{date(show.showDate)}</p>
          <p className="mt-2 flex items-start gap-2 text-sm text-white/55"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#ff7756]" />{place}</p>
        </div>

        {!itineraryDay && <div id="mobile-run-of-show" className="grid grid-cols-5 border-y border-white/10 px-2 py-4 scroll-mt-24">
          {schedule.map(([label, entry]) => <div key={label} className="min-w-0 border-l border-white/10 px-2 first:border-l-0"><p className="truncate text-[8px] font-black uppercase tracking-[.08em] text-white/35">{label}</p><p className={`mt-1 text-sm font-black ${entry ? '' : 'text-white/25'}`}>{clock(entry)}</p></div>)}
        </div>}

        <div className={`grid gap-px bg-white/10 ${canEdit ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {destination ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noreferrer" className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 bg-[#171713] text-xs font-black"><Navigation className="h-4 w-4 text-[#ff7756]" />Directions</a> : <span className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 bg-[#171713] text-xs font-black text-white/35"><MapPin className="h-4 w-4" />No address</span>}
          {show.contactPhone ? <a href={`tel:${show.contactPhone}`} className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 bg-[#171713] text-xs font-black"><Phone className="h-4 w-4 text-[#ff7756]" />Call</a> : show.contactEmail ? <a href={`mailto:${show.contactEmail}`} className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 bg-[#171713] text-xs font-black"><Mail className="h-4 w-4 text-[#ff7756]" />Email</a> : <span className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 bg-[#171713] text-xs font-black text-white/35"><Phone className="h-4 w-4" />No contact</span>}
          {canEdit && <button type="button" onClick={onEdit} className="flex min-h-[62px] flex-col items-center justify-center gap-1.5 bg-[#ff5a36] text-xs font-black"><Pencil className="h-4 w-4" />Edit</button>}
        </div>
      </section>

      {offlineCopy && <div role="status" className="mt-3 flex gap-3 rounded-[18px] border border-[#e1a06f] bg-[#fff0df] p-4"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#c9671c]"/><div><p className="text-sm font-black">Saved copy — not live</p><p className="mt-1 text-xs leading-5 text-[#795633]">Downloaded {offlineSavedAt ? new Date(offlineSavedAt).toLocaleString() : 'at an unknown time'}. Times and locations may have changed.</p></div></div>}

      {!itineraryDay && needsAttention && <section className="mt-3 rounded-[18px] border border-[#e4a08d] bg-[#fff0e9] p-4">
        <div className="flex gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#d94b2d]" /><div><p className="text-sm font-black">Needs attention</p>{missing.length > 0 && <p className="mt-1 text-xs leading-5 text-[#6c655b]">Missing: {missing.join(', ')}</p>}{timingIssues.length > 0 && <p className="mt-1 text-xs font-bold leading-5 text-[#a73220]">{timingIssues.join('; ')}</p>}</div></div>
      </section>}

      <button type="button" onClick={onRefreshOffline} disabled={!online || refreshingOffline} className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-[#d6cec1] bg-[#fffaf1] px-4 text-left disabled:opacity-60">{refreshingOffline ? <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-[#ff5a36]"/> : <CloudDownload className="h-5 w-5 shrink-0 text-[#ff5a36]" />}<span className="flex-1"><span className="block text-sm font-black">{offlineSavedAt ? 'Available offline automatically' : 'Preparing offline copy'}</span><span className="mt-0.5 block text-xs text-[#70695f]">{offlineSavedAt ? `Saved ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(offlineSavedAt))}` : 'SceneGen saves upcoming day sheets on this device'}</span></span><span className="text-xs font-black text-[#ff5a36]">{!online ? 'Offline' : refreshingOffline ? 'Working' : 'Refresh'}</span></button>

      <div className={`mt-3 grid gap-2 ${canShare ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {canShare && <button type="button" onClick={onShare} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d3cabc] bg-[#fffaf1] text-xs font-black"><Share2 className="h-4 w-4 text-[#ff5a36]" />Share</button>}
        <button type="button" onClick={onPrint} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d3cabc] bg-[#fffaf1] text-xs font-black"><Printer className="h-4 w-4 text-[#ff5a36]" />Print</button>
      </div>

      <div className="mt-4 grid gap-3">
        <details className="group rounded-[18px] border border-[#d6cec1] bg-[#fffaf1]">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4"><MapPin className="h-5 w-5 text-[#ff5a36]" /><span className="flex-1 text-sm font-black">Venue and contact</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary>
          <div className="border-t border-[#ddd5c8] px-4 py-4 text-sm"><p className="font-black">{value(show.venueName)}</p><p className="mt-1 leading-5 text-[#70695f]">{value(show.venueAddress)}</p><p className="mt-3 text-[9px] font-black uppercase tracking-[.14em] text-[#8a8277]">Promoter / venue</p><p className="mt-1 font-bold">{value(show.contactName)}</p><div className="mt-3 flex flex-wrap gap-2">{show.contactPhone && <a href={`tel:${show.contactPhone}`} className="rounded-full bg-[#171713] px-4 py-2 text-xs font-black text-white">Call {show.contactPhone}</a>}{show.contactEmail && <a href={`mailto:${show.contactEmail}`} className="rounded-full border border-[#cfc6b8] px-4 py-2 text-xs font-black">Email</a>}</div></div>
        </details>
        {financialVisible && <details className="group rounded-[18px] border border-[#d6cec1] bg-[#fffaf1]"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4"><ReceiptText className="h-5 w-5 text-[#ff5a36]" /><span className="flex-1 text-sm font-black">Commercials</span><span className="text-xs font-black">{money(show.guarantee, show.currency)}</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary><div className="grid grid-cols-2 gap-px border-t border-[#ddd5c8] bg-[#ddd5c8]"><div className="bg-[#fffaf1] p-4"><p className="text-[9px] font-black uppercase text-[#827a6f]">Deal</p><p className="mt-1 text-sm font-black capitalize">{value(show.dealType?.replaceAll('_', ' '))}</p></div><div className="bg-[#fffaf1] p-4"><p className="text-[9px] font-black uppercase text-[#827a6f]">Payment</p><p className="mt-1 text-sm font-black">{show.isPaid ? 'Paid' : 'Not marked paid'}</p></div></div></details>}
        {show.notes && <details className="group rounded-[18px] border border-[#d6cec1] bg-[#fffaf1]"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4"><FileText className="h-5 w-5 text-[#ff5a36]" /><span className="flex-1 text-sm font-black">Show notes</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary><p className="whitespace-pre-wrap border-t border-[#ddd5c8] px-4 py-4 text-sm leading-6 text-[#5e584f]">{show.notes}</p></details>}
      </div>
    </div>
  );
}
