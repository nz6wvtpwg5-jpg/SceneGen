'use client';

import Link from 'next/link';
import {
  ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Clock3, MapPin,
  Navigation, Phone, Plus, Route, TriangleAlert,
} from 'lucide-react';

export type MobileTodayShow = {
  id: string;
  showDate?: string;
  date?: string;
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  city?: string;
  venueCountry?: string;
  country?: string;
  status?: string;
  loadInTime?: string;
  soundCheckTime?: string;
  doorTime?: string;
  doorsTime?: string;
  showTime?: string;
  startTime?: string;
  endTime?: string;
  contactName?: string;
  contactPhone?: string;
  readinessPercentage?: number;
};

type ActionItem = { title: string; detail: string; href: string; priority: string };

type Props = {
  entityName: string;
  shows: MobileTodayShow[];
  unreadCount: number;
  actionItems: ActionItem[];
};

const dateKey = (value?: string) => value?.split('T')[0] || '';

const todayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value?: string, includeWeekday = false) => {
  const key = dateKey(value);
  if (!key) return 'Date not set';
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return new Intl.DateTimeFormat('en-GB', includeWeekday
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
};

const compactDate = (value?: string) => {
  const key = dateKey(value);
  const date = key ? new Date(`${key}T12:00:00`) : null;
  if (!date || Number.isNaN(date.getTime())) return { day: '—', month: 'TBD' };
  return {
    day: new Intl.DateTimeFormat('en-GB', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date).toUpperCase(),
  };
};

const time = (value?: string) => value ? value.slice(0, 5) : '—';

const showName = (show: MobileTodayShow) => show.venueName || show.venueCity || show.city || 'Show details pending';

const location = (show: MobileTodayShow) => [
  show.venueAddress,
  show.venueCity || show.city,
  show.venueCountry || show.country,
].filter(Boolean).join(', ');

export function MobileTodayDashboard({ entityName, shows, unreadCount, actionItems }: Props) {
  const today = todayKey();
  const todayShow = shows.find((show) => dateKey(show.showDate || show.date) === today);
  const focusShow = todayShow || shows[0];
  const laterShows = shows.filter((show) => show.id !== focusShow?.id).slice(0, 3);
  const focusLocation = focusShow ? location(focusShow) : '';
  const directionsUrl = focusLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(focusLocation)}`
    : null;
  const schedule = focusShow ? [
    ['Load-in', focusShow.loadInTime],
    ['Soundcheck', focusShow.soundCheckTime],
    ['Doors', focusShow.doorsTime || focusShow.doorTime],
    ['Stage', focusShow.showTime || focusShow.startTime],
    ['Finish', focusShow.endTime],
  ] : [];
  const knownTimes = schedule.filter(([, value]) => value);
  const readiness = typeof focusShow?.readinessPercentage === 'number'
    ? Math.max(0, Math.min(100, focusShow.readinessPercentage))
    : null;

  return (
    <div className="min-h-full bg-[#f2eee5] px-4 pb-6 pt-5 text-[#1a1916] sm:hidden">
      <header className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff5a36]">{entityName} / Live desk</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[34px] font-black leading-none tracking-[-0.045em]">Today</h1>
            <p className="mt-2 text-sm font-medium text-[#746d63]">{formatDate(today, true)}</p>
          </div>
          <Link href="/shows?create=show" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#ff5a36] px-4 text-sm font-bold text-white" aria-label="Add show">
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span>Add show</span>
          </Link>
        </div>
      </header>

      {focusShow ? (
        <section className="overflow-hidden rounded-[24px] bg-[#171713] text-white shadow-[0_14px_35px_rgba(23,23,19,.16)]">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#ff5a36] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em]">
                {todayShow ? 'Today’s show' : 'Next show'}
              </span>
              <span className="text-xs font-bold text-white/55">{formatDate(focusShow.showDate || focusShow.date)}</span>
            </div>
            <h2 className="mt-5 text-[28px] font-black leading-[1.02] tracking-[-0.035em]">{showName(focusShow)}</h2>
            <p className="mt-2 flex items-start gap-2 text-sm leading-5 text-white/60">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#ff7756]" />
              {[focusShow.venueCity || focusShow.city, focusShow.venueCountry || focusShow.country].filter(Boolean).join(', ') || 'Location pending'}
            </p>
          </div>

          <div className="grid grid-cols-5 border-b border-white/10 px-2 py-4">
            {schedule.map(([label, value]) => (
              <div key={label} className="min-w-0 border-l border-white/10 px-2 first:border-l-0">
                <p className="truncate text-[8px] font-black uppercase tracking-[0.1em] text-white/40">{label}</p>
                <p className={`mt-1 text-sm font-black ${value ? 'text-white' : 'text-white/25'}`}>{time(value)}</p>
              </div>
            ))}
          </div>

          {readiness !== null && (
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.13em]">
                <span className="text-white/45">Show readiness</span><span>{readiness}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#78d39b]" style={{ width: `${readiness}%` }} /></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-px bg-white/10">
            <Link href={`/shows/${focusShow.id}`} className="flex min-h-14 items-center justify-center gap-2 bg-[#171713] text-sm font-black">
              Open day sheet <ChevronRight className="h-4 w-4 text-[#ff7756]" />
            </Link>
            {directionsUrl ? (
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="flex min-h-14 items-center justify-center gap-2 bg-[#171713] text-sm font-black">
                Directions <Navigation className="h-4 w-4 text-[#ff7756]" />
              </a>
            ) : (
              <Link href={`/shows/${focusShow.id}`} className="flex min-h-14 items-center justify-center gap-2 bg-[#171713] text-sm font-black text-white/50">Add location <MapPin className="h-4 w-4" /></Link>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-[24px] bg-[#ff5a36] p-6 text-white shadow-[0_14px_35px_rgba(255,90,54,.2)]">
          <CalendarDays className="h-7 w-7" />
          <h2 className="mt-5 text-3xl font-black leading-none tracking-[-0.04em]">No show on deck.</h2>
          <p className="mt-3 text-sm leading-6 text-white/75">Add the next confirmed date to start the working schedule.</p>
          <Link href="/shows?create=show" className="mt-6 flex min-h-12 items-center justify-between border-t border-white/30 pt-4 text-sm font-black">Add a show <ArrowRight className="h-4 w-4" /></Link>
        </section>
      )}

      {focusShow && (
        <section className="mt-4 grid grid-cols-3 gap-2">
          {directionsUrl && <a href={directionsUrl} target="_blank" rel="noreferrer" className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#d6cec1] bg-[#fffaf1] text-xs font-black"><Navigation className="h-5 w-5 text-[#ff5a36]" />Navigate</a>}
          {focusShow.contactPhone && <a href={`tel:${focusShow.contactPhone}`} className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#d6cec1] bg-[#fffaf1] text-xs font-black"><Phone className="h-5 w-5 text-[#ff5a36]" />Call contact</a>}
          <Link href="/tours" className="flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#d6cec1] bg-[#fffaf1] text-xs font-black"><Route className="h-5 w-5 text-[#ff5a36]" />Tour route</Link>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff5a36]">Next movements</p><h2 className="mt-1 text-xl font-black tracking-[-0.025em]">Coming up</h2></div>
          <Link href="/shows" className="text-xs font-black">All shows</Link>
        </div>
        <div className="overflow-hidden rounded-[20px] border border-[#d6cec1] bg-[#fffaf1]">
          {laterShows.length ? laterShows.map((show, index) => {
            const date = compactDate(show.showDate || show.date);
            return (
            <Link href={`/shows/${show.id}`} key={show.id} className={`flex min-h-[76px] items-center gap-4 px-4 ${index ? 'border-t border-[#ddd5c8]' : ''}`}>
              <div className="w-12 shrink-0 text-center"><p className="text-[10px] font-black uppercase text-[#ff5a36]">{date.month}</p><p className="text-xl font-black leading-none">{date.day}</p></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{showName(show)}</p><p className="mt-1 truncate text-xs text-[#746d63]">{[show.venueCity || show.city, show.venueCountry || show.country].filter(Boolean).join(', ') || 'Location pending'}</p></div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#a59d91]" />
            </Link>
            );
          }) : <div className="p-5 text-sm text-[#746d63]">No later shows in the schedule.</div>}
        </div>
      </section>

      {(actionItems.length > 0 || unreadCount > 0 || (focusShow && knownTimes.length < schedule.length)) && (
        <section className="mt-6">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff5a36]">Needs attention</p>
          <div className="mt-3 overflow-hidden rounded-[20px] border border-[#d6cec1] bg-[#fffaf1]">
            {focusShow && knownTimes.length < schedule.length && (
              <Link href={`/shows/${focusShow.id}`} className="flex min-h-[68px] items-center gap-3 px-4">
                <TriangleAlert className="h-5 w-5 shrink-0 text-[#d78222]" /><span className="flex-1"><span className="block text-sm font-black">Complete today’s timings</span><span className="mt-0.5 block text-xs text-[#746d63]">{schedule.length - knownTimes.length} schedule {schedule.length - knownTimes.length === 1 ? 'time is' : 'times are'} still missing</span></span><ChevronRight className="h-4 w-4 text-[#a59d91]" />
              </Link>
            )}
            {actionItems.slice(0, 2).map((item, index) => (
              <Link href={item.href} key={item.title} className={`flex min-h-[68px] items-center gap-3 px-4 ${(focusShow && knownTimes.length < schedule.length) || index ? 'border-t border-[#ddd5c8]' : ''}`}>
                {item.priority === 'New' ? <Clock3 className="h-5 w-5 shrink-0 text-[#ff5a36]" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-[#78a887]" />}
                <span className="flex-1"><span className="block text-sm font-black">{item.title}</span><span className="mt-0.5 block text-xs text-[#746d63]">{item.detail}</span></span><ChevronRight className="h-4 w-4 text-[#a59d91]" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
