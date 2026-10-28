'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  Bus,
  CalendarDays,
  ChevronDown,
  Clock3,
  ExternalLink,
  Hotel,
  MapPin,
  Navigation,
  Plane,
} from 'lucide-react';

type Show = Record<string, unknown> & {
  festivalName?: string;
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  venueState?: string;
  venueCountry?: string;
  showDate?: string;
  loadInTime?: string;
  soundCheckTime?: string;
  doorsTime?: string;
  showTime?: string;
  endTime?: string;
};

type Place = { venue_name?: string | null; city?: string | null; country?: string | null };
type Travel = {
  transport_mode?: string | null;
  departure_at?: string | null;
  arrival_at?: string | null;
  suggested_departure_local?: string | null;
  duration_minutes?: number | null;
  distance_miles?: number | null;
  origin?: Place | null;
  destination?: Place | null;
  border_notes?: string | null;
  ferry_notes?: string | null;
  tolls_vignettes_notes?: string | null;
  low_emission_zone_notes?: string | null;
  parking_access_notes?: string | null;
  driver_notes?: string | null;
};
type Accommodation = {
  hotel_name?: string | null;
  address?: string | null;
  booking_reference?: string | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
  rooming_notes?: string | null;
  breakfast_notes?: string | null;
  parking_notes?: string | null;
  confirmation_url?: string | null;
};
type Flight = {
  booking_status?: 'not_booked' | 'planned' | 'booked';
  flight_date?: string | null;
  flight_number?: string | null;
  airline?: string | null;
  departure_airport?: string | null;
  departure_iata?: string | null;
  scheduled_departure?: string | null;
  arrival_airport?: string | null;
  arrival_iata?: string | null;
  scheduled_arrival?: string | null;
  booking_reference?: string | null;
  notes?: string | null;
};
type Logistics = { travel?: Travel | null; accommodation?: Accommodation | null; flight?: Flight | null };
type ItineraryEvent = {
  id: string;
  title: string;
  category: string;
  day_offset: number;
  event_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  responsible_person?: string | null;
  notes?: string | null;
};

const value = (entry: unknown) => typeof entry === 'string' ? entry.trim() : '';
const readableDate = (entry?: string | null) => {
  if (!entry) return 'Date not confirmed';
  const date = new Date(entry.length === 10 ? `${entry}T12:00:00` : entry);
  return Number.isNaN(date.getTime()) ? 'Date not confirmed' : new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};
const readableInstant = (entry?: string | null) => {
  if (!entry) return 'Time not confirmed';
  const date = new Date(entry);
  return Number.isNaN(date.getTime()) ? 'Time not confirmed' : new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
};
const shortTime = (entry?: string | null) => entry ? entry.slice(0, 5) : '';
const place = (entry?: Place | null) => entry ? [entry.venue_name, entry.city, entry.country].filter(Boolean).join(', ') : '';
const hasTravel = (travel?: Travel | null) => Boolean(travel && [travel.departure_at, travel.arrival_at, travel.distance_miles, travel.duration_minutes, travel.border_notes, travel.ferry_notes, travel.parking_access_notes, travel.driver_notes].some(Boolean));

function Detail({ label, children }: { label: string; children?: React.ReactNode }) {
  if (!children) return null;
  return <div className="min-w-0 max-w-full border-t border-[#ded6ca] py-3 first:border-0 first:pt-0 last:pb-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#777064]">{label}</p><div className="mt-1 min-w-0 max-w-full whitespace-pre-line break-words text-sm font-semibold leading-6 text-[#302e29] [overflow-wrap:anywhere]">{children}</div></div>;
}

function Disclosure({ title, summary, icon, children, open = false }: { title: string; summary: string; icon: React.ReactNode; children: React.ReactNode; open?: boolean }) {
  return <details open={open} className="group min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] shadow-[0_12px_35px_rgba(45,37,24,.06)]">
    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f2ebe0] text-[#e74428]">{icon}</span>
      <span className="min-w-0 flex-1"><strong className="block text-base">{title}</strong><span className="mt-0.5 block truncate text-xs text-[#686258]">{summary}</span></span>
      <ChevronDown size={19} className="shrink-0 text-[#777064] transition-transform group-open:rotate-180" />
    </summary>
    <div className="min-w-0 max-w-full overflow-hidden border-t border-[#ded6ca] px-4 py-4">{children}</div>
  </details>;
}

export default function BandMemberDaySheet({ showId, apiBase, show, roleLabel = 'Band member' }: { showId: string; apiBase: string; show: Show; roleLabel?: string }) {
  const [logistics, setLogistics] = useState<Logistics | null>(null);
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${apiBase}/${encodeURIComponent(showId)}/logistics`, { cache: 'no-store' }).then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || 'Travel details are unavailable');
        return body as Logistics;
      }),
      fetch(`${apiBase}/${encodeURIComponent(showId)}/itinerary`, { cache: 'no-store' }).then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || 'The itinerary is unavailable');
        return (body.events || []) as ItineraryEvent[];
      }),
    ]).then(([nextLogistics, nextEvents]) => {
      if (!active) return;
      setLogistics(nextLogistics);
      setEvents(nextEvents);
    }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Some day-sheet details are unavailable');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiBase, showId]);

  const schedule = useMemo(() => [
    ['Load-in', value(show.loadInTime)],
    ['Soundcheck', value(show.soundCheckTime)],
    ['Doors', value(show.doorsTime)],
    ['Stage', value(show.showTime)],
    ['Finish', value(show.endTime)],
  ].filter((entry): entry is [string, string] => Boolean(entry[1])), [show]);
  const showDayEvents = events.filter((event) => event.day_offset === 0);
  const otherEvents = events.filter((event) => event.day_offset !== 0);
  const flight = logistics?.flight;
  const bookedFlight = flight?.booking_status === 'booked';
  const travel = logistics?.travel;
  const accommodation = logistics?.accommodation;
  const title = value(show.festivalName) || value(show.venueName) || value(show.venueCity) || 'Day sheet';
  const venue = value(show.venueName);
  const location = [value(show.venueCity), value(show.venueState), value(show.venueCountry)].filter(Boolean).join(', ');
  const address = [value(show.venueAddress), location].filter(Boolean).join(', ');
  const mapsHref = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '';

  return <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-clip">
    <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] shadow-[0_16px_45px_rgba(45,37,24,.08)]">
      <div className="bg-[#ff5738] p-5 text-white sm:p-7">
        <p className="text-[11px] font-black uppercase tracking-[.2em] text-white/80">{roleLabel} day sheet</p>
        <h1 className="mt-2 break-words text-[2rem] font-black leading-[1.02] tracking-[-.035em] [overflow-wrap:anywhere] sm:text-4xl">{title}</h1>
        <p className="mt-4 flex items-center gap-2 text-sm font-bold"><CalendarDays size={17}/>{readableDate(value(show.showDate))}</p>
        {(venue || location) && <p className="mt-2 flex items-start gap-2 text-sm text-white/90"><MapPin size={17} className="mt-0.5 shrink-0"/>{[venue, location].filter(Boolean).join(' · ')}</p>}
      </div>
      <div className="grid gap-1 px-5 py-3 text-xs font-semibold text-[#686258] sm:grid-cols-2"><span>Read-only operational access</span><span className="sm:text-right">Private and commercial details hidden</span></div>
    </section>

    {loading && <section className="rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] p-5 text-sm text-[#686258]">Loading travel and itinerary…</section>}
    {loadError && <section className="rounded-2xl border border-[#ff9d8c] bg-[#fff1ec] p-4 text-sm font-semibold">{loadError}</section>}

    {!loading && bookedFlight && <section className="min-w-0 max-w-full overflow-hidden rounded-2xl bg-[#17394a] p-5 text-white shadow-[0_18px_45px_rgba(23,57,74,.2)]">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/12"><Plane size={21}/></span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ff8a74]">Travel to this show</p><h2 className="mt-1 text-2xl font-black">{flight?.flight_number || 'Booked flight'}</h2><p className="mt-1 text-sm font-semibold text-white/80">{flight?.airline || 'Airline not recorded'}</p></div></div>
      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-y border-white/15 py-4"><div className="min-w-0"><p className="break-words text-2xl font-black">{flight?.departure_iata || '—'}</p><p className="mt-1 break-words text-xs text-white/65 [overflow-wrap:anywhere]">{flight?.departure_airport || 'Departure airport'}</p></div><span className="text-white/45">→</span><div className="min-w-0 text-right"><p className="break-words text-2xl font-black">{flight?.arrival_iata || '—'}</p><p className="mt-1 break-words text-xs text-white/65 [overflow-wrap:anywhere]">{flight?.arrival_airport || 'Arrival airport'}</p></div></div>
      <p className="mt-4 text-sm font-semibold">{readableInstant(flight?.scheduled_departure)} → {readableInstant(flight?.scheduled_arrival)}</p>
      {flight?.booking_reference && <p className="mt-3 text-sm text-white/75">Booking reference <strong className="ml-1 text-white">{flight.booking_reference}</strong></p>}
      {flight?.notes && <p className="mt-3 border-t border-white/15 pt-3 text-sm leading-6 text-white/75">{flight.notes}</p>}
    </section>}

    {!loading && hasTravel(travel) && <Disclosure title="Ground transport" summary={`${travel?.transport_mode || 'Journey'}${place(travel?.origin) ? ` from ${place(travel?.origin)}` : ''}`} icon={<Bus size={19}/>} open={!bookedFlight}>
      <Detail label="Route">{[place(travel?.origin), place(travel?.destination)].filter(Boolean).join(' → ')}</Detail>
      <Detail label="Departure">{readableInstant(travel?.departure_at || travel?.suggested_departure_local)}</Detail>
      <Detail label="Arrival">{readableInstant(travel?.arrival_at)}</Detail>
      <Detail label="Journey">{[travel?.distance_miles != null ? `${travel.distance_miles} miles` : '', travel?.duration_minutes != null ? `${Math.floor(travel.duration_minutes / 60)}h ${travel.duration_minutes % 60}m` : ''].filter(Boolean).join(' · ')}</Detail>
      <Detail label="Travel instructions">{[travel?.border_notes, travel?.ferry_notes, travel?.tolls_vignettes_notes, travel?.low_emission_zone_notes, travel?.parking_access_notes, travel?.driver_notes].filter(Boolean).join('\n')}</Detail>
    </Disclosure>}

    <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] p-5 shadow-[0_12px_35px_rgba(45,37,24,.06)]">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e74428]">Show day</p><h2 className="mt-1 text-xl font-black">Today’s timeline</h2>
      {(schedule.length || showDayEvents.length) ? <div className="relative mt-5 space-y-0 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-[#d8d0c3]">
        {[...schedule.map(([label, time], index) => ({ id: `schedule-${index}`, title: label, event_time: time, location: '', notes: '' })), ...showDayEvents].sort((left, right) => String(left.event_time || '99:99').localeCompare(String(right.event_time || '99:99'))).map((event) => <div key={event.id} className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-3 py-2"><span className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-[#171713] text-white"><Clock3 size={16}/></span><div className="pt-1"><p className="text-xs font-black tabular-nums text-[#e74428]">{shortTime(event.event_time) || 'Time TBC'}</p><p className="font-black">{event.title}</p>{event.location && <p className="mt-1 text-sm text-[#686258]">{event.location}</p>}{event.notes && <p className="mt-1 text-sm leading-6 text-[#686258]">{event.notes}</p>}</div></div>)}
      </div> : <p className="mt-4 text-sm text-[#686258]">Show-day timings have not been added yet.</p>}
    </section>

    {(venue || address) && <Disclosure title="Venue" summary={venue || location || 'Location details'} icon={<MapPin size={19}/>}>
      <Detail label="Venue">{venue}</Detail><Detail label="Address">{address}</Detail>
      {mapsHref && <a href={mapsHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#171713] px-4 text-sm font-bold text-white"><Navigation size={16}/>Open in Maps<ExternalLink size={14}/></a>}
    </Disclosure>}

    <Disclosure title="Accommodation" summary={accommodation?.hotel_name || 'Not added'} icon={accommodation ? <BedDouble size={19}/> : <Hotel size={19}/>}>
      {accommodation ? <><Detail label="Hotel">{accommodation.hotel_name}</Detail><Detail label="Address">{accommodation.address}</Detail><Detail label="Check-in">{readableInstant(accommodation.check_in_at)}</Detail><Detail label="Check-out">{readableInstant(accommodation.check_out_at)}</Detail><Detail label="Booking reference">{accommodation.booking_reference}</Detail><Detail label="Rooming">{accommodation.rooming_notes}</Detail><Detail label="Breakfast">{accommodation.breakfast_notes}</Detail><Detail label="Parking">{accommodation.parking_notes}</Detail>{accommodation.confirmation_url && <a href={accommodation.confirmation_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#171713] px-4 text-sm font-bold text-white">Open confirmation<ExternalLink size={14}/></a>}</> : <p className="text-sm text-[#686258]">No accommodation has been added for this stop.</p>}
    </Disclosure>

    {otherEvents.length > 0 && <Disclosure title="Around the show" summary={`${otherEvents.length} travel or itinerary item${otherEvents.length === 1 ? '' : 's'}`} icon={<Clock3 size={19}/>}>
      <div className="space-y-4">{otherEvents.map((event) => <div key={event.id} className="border-l-2 border-[#ff5738] pl-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#777064]">{event.day_offset < 0 ? `${Math.abs(event.day_offset)} day${event.day_offset === -1 ? '' : 's'} before` : `${event.day_offset} day${event.day_offset === 1 ? '' : 's'} after`} · {shortTime(event.event_time) || 'Time TBC'}</p><p className="mt-1 font-black">{event.title}</p>{event.location && <p className="mt-1 text-sm text-[#686258]">{event.location}</p>}{event.notes && <p className="mt-1 text-sm leading-6 text-[#686258]">{event.notes}</p>}</div>)}</div>
    </Disclosure>}
  </div>;
}
