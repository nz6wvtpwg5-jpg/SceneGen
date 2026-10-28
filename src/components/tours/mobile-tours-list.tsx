'use client';

import { CalendarDays, ChevronRight, Map, Plus, Route, Trash2 } from 'lucide-react';
import type { Tour } from '@/types/tour';
import { formatCurrency } from '@/lib/utils';

type TourStats = { showCount: number; currencyTotals: Array<{ currency: string; totalFees: number; totalCosts: number; profit: number }>; totalMiles: number | null };
type Props = { tours: Tour[]; stats: Record<string, TourStats>; loading: boolean; error: string | null; onCreate: () => void; onView: (id: string) => void; onDelete: (id: string) => void };

const date = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value.split('T')[0]}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
};

const money = (value: number, currency: string) => currency === 'UNSPECIFIED' ? `${value.toFixed(0)} (currency TBC)` : formatCurrency(value, currency);

export function MobileToursList({ tours, stats, loading, error, onCreate, onView, onDelete }: Props) {
  return (
    <div className="bg-[#f2eee5] pb-7 text-[#171713] sm:hidden">
      <header className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff5a36]">Route desk</p><h1 className="mt-1 text-[34px] font-black leading-none tracking-[-0.045em]">Tours</h1></div><button type="button" onClick={onCreate} className="flex min-h-12 items-center gap-2 rounded-full bg-[#ff5a36] px-5 text-sm font-black text-white"><Plus className="h-4 w-4" />Create</button></header>
      <p className="mt-4 text-sm leading-6 text-[#756e64]">Every run, its dates, distance and financial position.</p>

      {loading ? <div className="mt-5 space-y-3">{[1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-[22px] bg-[#e1dacf]" />)}</div>
        : error ? <div className="mt-5 rounded-[20px] border border-[#dba98f] bg-[#fff2e9] p-5"><p className="font-black">Tours unavailable</p><p className="mt-2 text-sm text-[#756e64]">Reopen this screen to try again.</p></div>
        : tours.length === 0 ? <div className="mt-5 rounded-[22px] bg-[#171713] p-6 text-white"><Route className="h-7 w-7 text-[#ff7756]" /><h2 className="mt-5 text-2xl font-black tracking-[-.035em]">No route on the board.</h2><p className="mt-2 text-sm leading-6 text-white/55">Create a tour to group dates into one working run.</p><button type="button" onClick={onCreate} className="mt-6 min-h-12 w-full rounded-full bg-[#ff5a36] text-sm font-black">Create first tour</button></div>
        : <div className="mt-5 space-y-3">{tours.map((tour) => {
          const tourStats = stats[tour.id];
          return <article key={tour.id} className="overflow-hidden rounded-[22px] border border-[#d6cec1] bg-[#fffaf1] shadow-[0_7px_18px_rgba(23,23,19,.05)]">
            <button type="button" onClick={() => onView(tour.id)} className="w-full p-5 text-left">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#ff5a36]">{tourStats?.showCount || 0} dates</p><h2 className="mt-2 truncate text-xl font-black tracking-[-.025em]">{tour.name}</h2></div><ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#9e968a]" /></div>
              <p className="mt-3 flex items-center gap-2 text-xs text-[#756e64]"><CalendarDays className="h-4 w-4 text-[#ff5a36]" />{tour.startDate && tour.endDate ? `${date(tour.startDate)} – ${date(tour.endDate)}` : 'Dates not scheduled'}</p>
              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#d8d0c4]">
                <div className="bg-[#f4eee4] p-3"><p className="text-[8px] font-black uppercase tracking-[.13em] text-[#837b70]">Distance</p><p className="mt-1 text-base font-black">{tourStats ? (tourStats.totalMiles == null ? 'Not calculated' : `${Math.round(tourStats.totalMiles).toLocaleString()} mi`) : '—'}</p></div>
                <div className="bg-[#f4eee4] p-3"><p className="text-[8px] font-black uppercase tracking-[.13em] text-[#837b70]">Projected net</p>{tourStats?.currencyTotals.length ? tourStats.currencyTotals.map((total) => <p key={total.currency} className={`mt-1 text-sm font-black ${total.profit < 0 ? 'text-[#ba3d2b]' : ''}`}>{money(total.profit, total.currency)}</p>) : <p className="mt-1 text-base font-black">—</p>}</div>
              </div>
            </button>
            <div className="grid grid-cols-[1fr_58px] border-t border-[#ddd5c8]"><button type="button" onClick={() => onView(tour.id)} className="flex min-h-14 items-center justify-center gap-2 text-sm font-black"><Map className="h-4 w-4 text-[#ff5a36]" />Open route</button><button type="button" onClick={() => onDelete(tour.id)} aria-label={`Delete ${tour.name}`} className="grid min-h-14 place-items-center border-l border-[#ddd5c8] text-[#a64938]"><Trash2 className="h-4 w-4" /></button></div>
          </article>;
        })}</div>}
    </div>
  );
}
