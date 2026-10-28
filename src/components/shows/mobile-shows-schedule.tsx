'use client';

import Link from 'next/link';
import { CalendarDays, ChevronRight, CircleAlert, Clock3, MapPin, Plus, Search } from 'lucide-react';
import type { Show, ShowStatus } from '@/types/show';
import type { Tour } from '@/types/tour';

type TimeFilter = 'upcoming' | 'past' | 'all';

type Props = {
  shows: Show[];
  tours: Tour[];
  loading: boolean;
  error: string | null;
  pendingCount: number;
  timeFilter: TimeFilter;
  timeCounts: Record<TimeFilter, number>;
  statusFilter: ShowStatus | 'pending' | 'all';
  tourFilter: string;
  searchQuery: string;
  onTimeFilter: (value: TimeFilter) => void;
  onStatusFilter: (value: ShowStatus | 'pending' | 'all') => void;
  onTourFilter: (value: string) => void;
  onSearch: (value: string) => void;
  onAdd: () => void;
};

const showDate = (value?: string) => {
  const key = value?.split('T')[0];
  const parsed = key ? new Date(`${key}T12:00:00`) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return { day: '—', month: 'TBD', weekday: 'Unscheduled' };
  return {
    day: new Intl.DateTimeFormat('en-GB', { day: '2-digit' }).format(parsed),
    month: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(parsed).toUpperCase(),
    weekday: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(parsed),
  };
};

const statusLabel = (status?: string) => {
  if (status === 'pending_acceptance' || status === 'pending_invite') return 'Pending';
  return status ? status.replaceAll('_', ' ') : 'Unspecified';
};

export function MobileShowsSchedule(props: Props) {
  const tourNames = new Map(props.tours.map((tour) => [tour.id, tour.name]));

  return (
    <div className="bg-[#f2eee5] pb-7 text-[#171713] sm:hidden">
      <header className="flex items-end justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff5a36]">Forward schedule</p><h1 className="mt-1 text-[34px] font-black leading-none tracking-[-0.045em]">Shows</h1></div>
        <button type="button" onClick={props.onAdd} className="flex min-h-12 items-center gap-2 rounded-full bg-[#ff5a36] px-5 text-sm font-black text-white shadow-[0_9px_22px_rgba(255,90,54,.22)]"><Plus className="h-4 w-4" />Add</button>
      </header>

      {props.pendingCount > 0 && (
        <button type="button" onClick={() => props.onStatusFilter('pending')} className="mt-5 flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[#e0a96e] bg-[#fff5df] px-4 text-left">
          <CircleAlert className="h-5 w-5 shrink-0 text-[#bd6d1c]" /><span className="flex-1 text-sm font-bold">{props.pendingCount} show {props.pendingCount === 1 ? 'needs' : 'shows need'} a response</span><ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div className="mt-5 grid grid-cols-3 rounded-2xl bg-[#dfd8cc] p-1">
        {(['upcoming', 'past', 'all'] as const).map((filter) => (
          <button key={filter} type="button" onClick={() => props.onTimeFilter(filter)} className={`min-h-11 rounded-xl px-2 text-xs font-black capitalize ${props.timeFilter === filter ? 'bg-[#171713] text-white shadow-sm' : 'text-[#686258]'}`}>{filter} ({props.timeCounts[filter]})</button>
        ))}
      </div>

      <div className="mt-3 flex min-h-12 items-center gap-3 rounded-2xl border border-[#d6cec1] bg-[#fffaf1] px-4">
        <Search className="h-4 w-4 shrink-0 text-[#8a8277]" />
        <input value={props.searchQuery} onChange={(event) => props.onSearch(event.target.value)} placeholder="Search venue or city" aria-label="Search shows" className="min-w-0 flex-1 rounded-sm bg-transparent text-base outline-none placeholder:text-[#999186] focus-visible:ring-2 focus-visible:ring-[#ff5a36] focus-visible:ring-offset-2" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select aria-label="Filter shows by status" value={props.statusFilter} onChange={(event) => props.onStatusFilter(event.target.value as Props['statusFilter'])} className="min-h-12 min-w-0 rounded-2xl border border-[#d6cec1] bg-[#fffaf1] px-3 text-sm font-bold outline-none focus-visible:border-[#ff5a36] focus-visible:ring-2 focus-visible:ring-[#ff5a36]/30">
          <option value="all">Any status</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option>
        </select>
        <select aria-label="Filter shows by tour" value={props.tourFilter} onChange={(event) => props.onTourFilter(event.target.value)} className="min-h-12 min-w-0 rounded-2xl border border-[#d6cec1] bg-[#fffaf1] px-3 text-sm font-bold outline-none focus-visible:border-[#ff5a36] focus-visible:ring-2 focus-visible:ring-[#ff5a36]/30">
          <option value="all">All tours</option><option value="standalone">One-offs</option>{props.tours.map((tour) => <option key={tour.id} value={tour.id}>{tour.name}</option>)}
        </select>
      </div>

      <div className="mt-5 flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.13em] text-[#756e64]">{props.shows.length} {props.shows.length === 1 ? 'show' : 'shows'}</p><Link href="/import" className="text-xs font-black text-[#ff5a36]">Import dates</Link></div>

      {props.loading ? (
        <div className="mt-3 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-[20px] bg-[#e1dacf]" />)}</div>
      ) : props.error ? (
        <div className="mt-3 rounded-[20px] border border-[#dba98f] bg-[#fff2e9] p-5"><p className="font-black">Schedule unavailable</p><p className="mt-2 text-sm leading-6 text-[#756e64]">Pull down or reopen Shows to try again.</p></div>
      ) : props.shows.length === 0 ? (
        <div className="mt-3 rounded-[20px] border border-[#d6cec1] bg-[#fffaf1] p-6 text-center"><CalendarDays className="mx-auto h-7 w-7 text-[#ff5a36]" /><p className="mt-4 text-lg font-black">No matching shows.</p><p className="mt-2 text-sm text-[#756e64]">Change the filters or add the next date.</p></div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-[20px] border border-[#d6cec1] bg-[#fffaf1]">
          {props.shows.map((show, index) => {
            const date = showDate(show.showDate);
            const readiness = typeof show.readinessPercentage === 'number' ? Math.max(0, Math.min(100, show.readinessPercentage)) : null;
            return (
              <Link href={`/shows/${show.id}`} key={show.id} className={`block min-h-[118px] p-4 ${index ? 'border-t border-[#ddd5c8]' : ''}`}>
                <div className="flex gap-4">
                  <div className="w-12 shrink-0 text-center"><p className="text-[9px] font-black uppercase text-[#ff5a36]">{date.month}</p><p className="text-2xl font-black leading-none">{date.day}</p><p className="mt-1 text-[10px] font-bold text-[#8b8377]">{date.weekday}</p></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><p className="truncate text-base font-black">{show.venueName || show.venueCity || 'Venue pending'}</p><span className="shrink-0 rounded-full border border-[#d6cec1] px-2 py-1 text-[8px] font-black uppercase tracking-[.08em]">{statusLabel(show.status)}</span></div>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[#756e64]"><MapPin className="h-3.5 w-3.5 shrink-0 text-[#ff5a36]" />{[show.venueCity, show.venueCountry].filter(Boolean).join(', ') || 'Location pending'}</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold text-[#756e64]"><span className="truncate">{show.tourId ? tourNames.get(show.tourId) || 'Tour date' : 'One-off show'}</span><span className="flex shrink-0 items-center gap-1"><Clock3 className="h-3 w-3" />{show.showTime?.slice(0, 5) || 'Time TBC'}</span></div>
                    {readiness !== null && <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#ded7cb]"><div className="h-full bg-[#78a887]" style={{ width: `${readiness}%` }} /></div>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
