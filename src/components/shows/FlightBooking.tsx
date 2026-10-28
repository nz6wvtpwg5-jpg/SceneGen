'use client';

import { useState } from 'react';
import { Plane, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { getEntityId } from '@/lib/entity';

export type Flight = {
  booking_status?: 'not_booked' | 'planned' | 'booked'; flight_date?: string | null; flight_number?: string | null;
  airline?: string | null; departure_airport?: string | null; departure_iata?: string | null; scheduled_departure?: string | null;
  arrival_airport?: string | null; arrival_iata?: string | null; scheduled_arrival?: string | null; provider?: string | null;
  provider_flight_id?: string | null; booking_reference?: string | null; notes?: string | null;
};
type Draft = { bookingStatus: 'not_booked' | 'planned' | 'booked'; flightDate: string; flightNumber: string; airline: string; departureAirport: string; departureIata: string; scheduledDeparture: string; arrivalAirport: string; arrivalIata: string; scheduledArrival: string; bookingReference: string; notes: string };

const pad = (value: number) => String(value).padStart(2, '0');
const local = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const draft = (flight?: Flight | null): Draft => ({ bookingStatus: flight?.booking_status || 'not_booked', flightDate: flight?.flight_date?.slice(0, 10) || '', flightNumber: flight?.flight_number || '', airline: flight?.airline || '', departureAirport: flight?.departure_airport || '', departureIata: flight?.departure_iata || '', scheduledDeparture: local(flight?.scheduled_departure), arrivalAirport: flight?.arrival_airport || '', arrivalIata: flight?.arrival_iata || '', scheduledArrival: local(flight?.scheduled_arrival), bookingReference: flight?.booking_reference || '', notes: flight?.notes || '' });
const instant = (value: string) => value ? new Date(value).toISOString() : '';
const when = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Time not confirmed';
const route = (flight?: Flight | null) => {
  if (!flight) return 'Airports not confirmed';
  const departure = flight.departure_iata;
  const arrival = flight.arrival_iata;
  return [departure, arrival].filter(Boolean).join(' → ') || 'Airports not confirmed';
};

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label><span className="text-xs font-black uppercase">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-3 text-base sm:h-11 sm:text-sm" /></label>;
}

export default function FlightBooking({ flight, logisticsEndpoint, canEdit, onSaved }: { flight?: Flight | null; logisticsEndpoint: string; canEdit: boolean; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Draft>(() => draft(flight));
  const [saving, setSaving] = useState(false);
  const headers = () => ({ 'Content-Type': 'application/json', ...(getEntityId() ? { 'X-Entity-Id': getEntityId()! } : {}) });
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((current) => ({ ...current, [key]: value }));
  async function save() {
    setSaving(true);
    try {
      const response = await fetch(logisticsEndpoint, { method: 'PATCH', headers: headers(), body: JSON.stringify({ section: 'flight', ...form, provider: '', providerFlightId: '', scheduledDeparture: instant(form.scheduledDeparture), scheduledArrival: instant(form.scheduledArrival) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Flight details could not be saved');
      await onSaved(); setEditing(false); toast.success('Flight details updated');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Flight details could not be saved'); }
    finally { setSaving(false); }
  }
  const booked = flight?.booking_status === 'booked';
  return <>
    <article className="rounded-lg border border-[#d8d0c3] bg-[#f4ede2] p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#315f78] text-white"><Plane size={20}/></span><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#e74428]">Flight</p><h3 className="text-xl font-black">{booked ? flight?.flight_number : flight?.booking_status === 'planned' ? 'Not booked yet' : 'No flight booked'}</h3></div></div>{canEdit && <button type="button" onClick={() => { setForm(draft(flight)); setEditing(true); }} className="rounded-md border border-[#c9c0b4] p-2.5 hover:bg-white" aria-label="Edit flight"><Pencil size={16}/></button>}</div>{booked && <div className="mt-5 space-y-2 text-sm"><p className="font-black">{flight?.airline || 'Airline not recorded'} · {route(flight)}</p><p>{when(flight?.scheduled_departure)} → {when(flight?.scheduled_arrival)}</p>{flight?.booking_reference && <p>Booking reference: <strong>{flight.booking_reference}</strong></p>}</div>}{!booked && <p className="mt-5 text-sm text-[#686258]">Record whether air travel is required, then select the booked service.</p>}</article>
    {editing && <div className="fixed inset-0 z-[130] overflow-y-auto bg-black/65 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="flight-editor-title"><div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col bg-[#f7f0e5] shadow-2xl sm:my-8 sm:min-h-0 sm:rounded-lg"><div className="mobile-safe-top sticky top-0 z-10 flex justify-between border-b border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:p-7"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">Transport</p><h3 id="flight-editor-title" className="mt-1 text-2xl font-black">Flight details</h3></div><button type="button" onClick={() => setEditing(false)} className="grid h-12 w-12 place-items-center rounded-full" aria-label="Close"><X/></button></div><div className="flex-1 space-y-5 p-4 sm:p-7"><label className="block"><span className="text-xs font-black uppercase">Is a flight booked?</span><select value={form.bookingStatus} onChange={(event) => update('bookingStatus', event.target.value as Draft['bookingStatus'])} className="mt-2 h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-3"><option value="not_booked">No</option><option value="planned">Not yet</option><option value="booked">Yes</option></select></label>{form.bookingStatus === 'booked' && <><p className="rounded-lg border border-[#d8d0c3] bg-white/60 p-4 text-sm text-[#686258]">Enter the details from the airline confirmation or booking email.</p><div className="grid gap-4 sm:grid-cols-2"><Input label="Flight number" value={form.flightNumber} onChange={(value) => update('flightNumber', value.toUpperCase())}/><Input label="Flight date" type="date" value={form.flightDate} onChange={(value) => update('flightDate', value)}/><Input label="Airline" value={form.airline} onChange={(value) => update('airline', value)}/><Input label="Booking reference" value={form.bookingReference} onChange={(value) => update('bookingReference', value)}/><Input label="Departure airport" value={form.departureAirport} onChange={(value) => update('departureAirport', value)}/><Input label="Departure code" value={form.departureIata} onChange={(value) => update('departureIata', value.toUpperCase().slice(0, 3))}/><Input label="Scheduled departure" type="datetime-local" value={form.scheduledDeparture} onChange={(value) => update('scheduledDeparture', value)}/><Input label="Arrival airport" value={form.arrivalAirport} onChange={(value) => update('arrivalAirport', value)}/><Input label="Arrival code" value={form.arrivalIata} onChange={(value) => update('arrivalIata', value.toUpperCase().slice(0, 3))}/><Input label="Scheduled arrival" type="datetime-local" value={form.scheduledArrival} onChange={(value) => update('scheduledArrival', value)}/></div><label className="block"><span className="text-xs font-black uppercase">Flight notes</span><textarea rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} className="mt-2 w-full rounded-md border border-[#d8d0c3] bg-white p-3"/></label></>}</div><div className="mobile-safe-bottom sticky bottom-0 grid grid-cols-2 gap-3 border-t border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:flex sm:justify-end sm:p-7"><button type="button" onClick={() => setEditing(false)} className="min-h-12 rounded-md border border-[#bdb5aa] px-5 font-bold">Cancel</button><button type="button" disabled={saving} onClick={() => void save()} className="min-h-12 rounded-md bg-[#e74428] px-6 font-bold text-white disabled:opacity-40">{saving ? 'Saving…' : 'Save flight'}</button></div></div></div>}
  </>;
}
