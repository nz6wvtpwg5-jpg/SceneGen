'use client';

import { useCallback, useEffect, useState } from 'react';
import { BedDouble, Bus, CircleAlert, ExternalLink, Hotel, MapPin, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { getEntityId } from '@/lib/entity';
import FlightBooking, { type Flight } from '@/components/shows/FlightBooking';

type FinancialAccess = 'hidden' | 'view' | 'edit';
type Place = { venue_name?: string | null; city?: string | null; country?: string | null };
type Travel = { transport_mode?: string | null; departure_at?: string | null; arrival_at?: string | null; duration_minutes?: number | null; distance_miles?: number | null; suggested_departure_local?: string | null; origin?: Place | null; destination?: Place; crosses_border?: boolean; border_notes?: string | null; ferry_notes?: string | null; tolls_vignettes_notes?: string | null; low_emission_zone_notes?: string | null; parking_access_notes?: string | null; driver_notes?: string | null };
type Accommodation = { hotel_name?: string | null; address?: string | null; booking_reference?: string | null; check_in_at?: string | null; check_out_at?: string | null; rooming_notes?: string | null; breakfast_notes?: string | null; parking_notes?: string | null; payer?: string | null; outstanding_balance?: number | null; currency?: string | null; confirmation_url?: string | null };
type Payload = { travel: Travel; accommodation: Accommodation | null; flight?: Flight | null; journeyAvailable?: boolean; isTourShow?: boolean };
type TravelDraft = { transportMode: string; departureAt: string; arrivalAt: string; durationMinutes: string; distanceMiles: string; borderNotes: string; ferryNotes: string; tollsVignettesNotes: string; lowEmissionZoneNotes: string; parkingAccessNotes: string; driverNotes: string };
type HotelDraft = { hotelName: string; address: string; bookingReference: string; checkInAt: string; checkOutAt: string; roomingNotes: string; breakfastNotes: string; parkingNotes: string; payer: string; outstandingBalance: string; currency: string; confirmationUrl: string };

const pad = (value: number) => String(value).padStart(2, '0');
const localInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const instantFromLocal = (value: string) => value ? new Date(value).toISOString() : '';
const displayInstant = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '';
const displayFloating = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '';
const placeLabel = (value?: Place | null) => value ? [value.venue_name, value.city, value.country].filter(Boolean).join(', ') : '';
const durationLabel = (minutes?: number | null) => minutes == null ? '' : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const money = (value?: number | null, code?: string | null) => {
  if (value == null) return 'No balance recorded';
  const currency = String(code || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency)
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
    : `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (currency not set)`;
};
const travelDraft = (travel: Travel): TravelDraft => ({ transportMode: travel.transport_mode || 'van', departureAt: localInput(travel.departure_at), arrivalAt: localInput(travel.arrival_at), durationMinutes: travel.duration_minutes?.toString() || '', distanceMiles: travel.distance_miles?.toString() || '', borderNotes: travel.border_notes || '', ferryNotes: travel.ferry_notes || '', tollsVignettesNotes: travel.tolls_vignettes_notes || '', lowEmissionZoneNotes: travel.low_emission_zone_notes || '', parkingAccessNotes: travel.parking_access_notes || '', driverNotes: travel.driver_notes || '' });
const hotelDraft = (hotel?: Accommodation | null): HotelDraft => ({ hotelName: hotel?.hotel_name || '', address: hotel?.address || '', bookingReference: hotel?.booking_reference || '', checkInAt: localInput(hotel?.check_in_at), checkOutAt: localInput(hotel?.check_out_at), roomingNotes: hotel?.rooming_notes || '', breakfastNotes: hotel?.breakfast_notes || '', parkingNotes: hotel?.parking_notes || '', payer: hotel?.payer || '', outstandingBalance: hotel?.outstanding_balance?.toString() || '', currency: hotel?.currency?.trim() || '', confirmationUrl: hotel?.confirmation_url || '' });

function Field({ label, value, warning = false }: { label: string; value?: string | null; warning?: boolean }) {
  if (!value) return null;
  return <div className={`rounded-lg border p-4 ${warning ? 'border-[#f0a08f] bg-[#fff1ec]' : 'border-[#dfd7ca] bg-white/55'}`}><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#777064]">{label}</p><p className={`mt-1.5 whitespace-pre-wrap break-words text-sm font-semibold leading-6 ${warning ? 'text-[#9b3c2c]' : 'text-[#37342f]'}`}>{value}</p></div>;
}
function Input({ label, value, onChange, type = 'text', disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return <label><span className="text-xs font-black uppercase">{label}</span><input type={type} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-3 text-base disabled:bg-[#e9e3d9] disabled:text-[#777064] sm:h-11 sm:text-sm" /></label>;
}
function Notes({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="text-xs font-black uppercase">{label}</span><textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-[#d8d0c3] bg-white p-3 text-base sm:text-sm" /></label>;
}

export default function TravelAccommodation({ showId, endpoint, canEdit, financialAccess = 'edit' }: { showId: string; endpoint?: string; canEdit: boolean; financialAccess?: FinancialAccess }) {
  const base = endpoint || `/api/shows/${encodeURIComponent(showId)}/logistics`;
  const [data, setData] = useState<Payload | null>(null);
  const [modal, setModal] = useState<'travel' | 'hotel' | null>(null);
  const [journey, setJourney] = useState<TravelDraft | null>(null);
  const [hotel, setHotel] = useState<HotelDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const entityId = getEntityId();
  const headers = useCallback((json = false): HeadersInit => ({ ...(json ? { 'Content-Type': 'application/json' } : {}), ...(entityId ? { 'X-Entity-Id': entityId } : {}) }), [entityId]);
  const load = useCallback(async () => {
    const response = await fetch(base, { cache: 'no-store', headers: headers() });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || 'Unable to load travel and accommodation');
    setData(body);
  }, [base, headers]);
  useEffect(() => { void load().catch((error) => toast.error(error.message)); }, [load]);

  function openTravel() { if (data) { setJourney(travelDraft(data.travel)); setModal('travel'); } }
  function openHotel() { setHotel(hotelDraft(data?.accommodation)); setModal('hotel'); }
  async function save(section: 'travel' | 'accommodation', body: Record<string, unknown>) {
    setSaving(true);
    try {
      const response = await fetch(base, { method: 'PATCH', headers: headers(true), body: JSON.stringify({ section, ...body }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Details could not be saved');
      await load();
      setModal(null);
      toast.success(section === 'travel' ? 'Journey updated' : 'Accommodation updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Details could not be saved');
    } finally {
      setSaving(false);
    }
  }
  if (!data) return <section className="h-64 animate-pulse rounded-lg bg-[#e6ded1]" />;
  const travel = data.travel || {};
  const accommodation = data.accommodation;
  const missingBorder = travel.crosses_border && !travel.border_notes;
  const showJourney = data.journeyAvailable === true;
  const origin = placeLabel(travel.origin);
  const destination = placeLabel(travel.destination);

  return <section className="rounded-[22px] border border-[#d8d0c3] bg-[#fffaf2] p-4 shadow-[0_18px_50px_rgba(45,37,24,.07)] sm:rounded-lg sm:p-6 md:p-7">
    <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">On the road</p><h2 className="mt-1 text-2xl font-black">Travel & accommodation</h2><p className="mt-2 text-sm text-[#686258]">Flights, onward travel and overnight details for this show.</p></div>
    <div className={`mt-7 grid gap-5 ${showJourney ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
      <FlightBooking flight={data.flight} logisticsEndpoint={base} canEdit={canEdit} onSaved={load} />
      {showJourney && <article className="rounded-lg border border-[#d8d0c3] bg-[#f4ede2] p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#171713] text-white"><Bus size={20} /></span><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#e74428]">Inbound journey</p><h3 className="text-xl font-black capitalize">{travel.transport_mode || 'Ground transport'}</h3></div></div>{canEdit && <button type="button" onClick={openTravel} className="rounded-md border border-[#c9c0b4] p-2.5 hover:bg-white" aria-label="Edit journey" title="Edit journey"><Pencil size={16} /></button>}</div>
        {(origin || destination) && <div className="mt-5 flex flex-wrap items-center gap-3 text-sm"><MapPin size={17} />{origin && <span className="font-bold">{origin}</span>}{origin && destination && <span>→</span>}{destination && <span className="font-bold">{destination}</span>}</div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Distance" value={travel.distance_miles == null ? '' : `${Number(travel.distance_miles).toLocaleString()} mi`} /><Field label="Journey time" value={durationLabel(travel.duration_minutes)} /><Field label="Departure" value={travel.departure_at ? displayInstant(travel.departure_at) : travel.suggested_departure_local ? `${displayFloating(travel.suggested_departure_local)} (suggested)` : ''} /><Field label="Arrival" value={displayInstant(travel.arrival_at)} /></div>
        {missingBorder && <div className="mt-3 flex gap-3 rounded-lg border border-[#f0a08f] bg-[#fff1ec] p-4 text-sm font-semibold text-[#923a2a]"><CircleAlert className="shrink-0" size={18} /><span>This route crosses a border, but no border instructions are recorded.</span></div>}
        <div className="mt-3 grid gap-3"><Field label="Border / documents" value={travel.border_notes} /><Field label="Ferries / trains" value={travel.ferry_notes} /><Field label="Tolls, vignettes & low-emission zones" value={[travel.tolls_vignettes_notes, travel.low_emission_zone_notes].filter(Boolean).join('\n')} /><Field label="Parking & driver notes" value={[travel.parking_access_notes, travel.driver_notes].filter(Boolean).join('\n')} /></div>
      </article>}
      <article className="rounded-lg border border-[#d8d0c3] bg-[#f4ede2] p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e74428] text-white"><BedDouble size={20} /></span><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#e74428]">Accommodation</p><h3 className="text-xl font-black">{accommodation?.hotel_name || 'No hotel recorded'}</h3></div></div>{canEdit && <button type="button" onClick={openHotel} className="rounded-md border border-[#c9c0b4] p-2.5 hover:bg-white" aria-label="Edit accommodation" title="Edit accommodation"><Pencil size={16} /></button>}</div>
        {accommodation ? <><p className="mt-5 flex items-start gap-2 text-sm font-semibold"><MapPin size={17} className="mt-0.5 shrink-0" />{accommodation.address || 'Address not set'}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Check-in" value={displayInstant(accommodation.check_in_at)} /><Field label="Check-out" value={displayInstant(accommodation.check_out_at)} /><Field label="Booking reference" value={accommodation.booking_reference} />{financialAccess !== 'hidden' && <Field label="Paid by" value={accommodation.payer} />}{financialAccess !== 'hidden' && <Field label="Outstanding balance" value={money(accommodation.outstanding_balance, accommodation.currency)} />}<Field label="Breakfast" value={accommodation.breakfast_notes} /><Field label="Rooming" value={accommodation.rooming_notes} /><Field label="Parking" value={accommodation.parking_notes} /></div>{accommodation.confirmation_url && <a href={accommodation.confirmation_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#e54525]">Open confirmation <ExternalLink size={15} /></a>}</> : <div className="mt-6 rounded-lg border border-dashed border-[#bdb5aa] p-8 text-center"><Hotel className="mx-auto text-[#777064]" /><p className="mt-3 font-bold">No accommodation has been added for this stop.</p></div>}
      </article>
    </div>

    {modal === 'travel' && journey && <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/65 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="travel-editor-title"><div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col bg-[#f7f0e5] shadow-2xl sm:my-8 sm:min-h-0 sm:rounded-lg"><div className="mobile-safe-top sticky top-0 z-10 flex justify-between border-b border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:rounded-t-lg sm:p-7"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">Travel plan</p><h3 id="travel-editor-title" className="mt-1 text-2xl font-black sm:mt-2 sm:text-3xl">Edit inbound journey</h3></div><button type="button" onClick={() => setModal(null)} className="grid h-12 w-12 place-items-center rounded-full hover:bg-black/10" aria-label="Close"><X /></button></div><div className="grid flex-1 gap-4 p-4 sm:grid-cols-2 sm:p-7"><label><span className="text-xs font-black uppercase">Transport</span><select value={journey.transportMode} onChange={(event) => setJourney({ ...journey, transportMode: event.target.value })} className="mt-2 h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-3 text-base sm:h-11 sm:text-sm">{['van', 'bus', 'car', 'train', 'flight', 'ferry', 'other'].map((mode) => <option key={mode} value={mode}>{mode[0].toUpperCase() + mode.slice(1)}</option>)}</select></label><Input label="Distance (miles)" type="number" value={journey.distanceMiles} onChange={(value) => setJourney({ ...journey, distanceMiles: value })} /><Input label="Departure" type="datetime-local" value={journey.departureAt} onChange={(value) => setJourney({ ...journey, departureAt: value })} /><Input label="Arrival" type="datetime-local" value={journey.arrivalAt} onChange={(value) => setJourney({ ...journey, arrivalAt: value })} /><Input label="Duration (minutes)" type="number" value={journey.durationMinutes} onChange={(value) => setJourney({ ...journey, durationMinutes: value })} /><div /><Notes label="Border / document instructions" value={journey.borderNotes} onChange={(value) => setJourney({ ...journey, borderNotes: value })} /><Notes label="Ferry / train instructions" value={journey.ferryNotes} onChange={(value) => setJourney({ ...journey, ferryNotes: value })} /><Notes label="Tolls / vignettes" value={journey.tollsVignettesNotes} onChange={(value) => setJourney({ ...journey, tollsVignettesNotes: value })} /><Notes label="Low-emission zones" value={journey.lowEmissionZoneNotes} onChange={(value) => setJourney({ ...journey, lowEmissionZoneNotes: value })} /><Notes label="Parking / access" value={journey.parkingAccessNotes} onChange={(value) => setJourney({ ...journey, parkingAccessNotes: value })} /><Notes label="Driver notes" value={journey.driverNotes} onChange={(value) => setJourney({ ...journey, driverNotes: value })} /></div><div className="mobile-safe-bottom sticky bottom-0 grid grid-cols-2 gap-3 border-t border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:flex sm:justify-end sm:rounded-b-lg sm:p-7"><button type="button" onClick={() => setModal(null)} className="min-h-12 rounded-md border border-[#bdb5aa] px-5 py-3 font-bold sm:min-h-11">Cancel</button><button type="button" disabled={saving} onClick={() => void save('travel', { ...journey, departureAt: instantFromLocal(journey.departureAt), arrivalAt: instantFromLocal(journey.arrivalAt) })} className="min-h-12 rounded-md bg-[#e74428] px-6 py-3 font-bold text-white disabled:opacity-40 sm:min-h-11">Save journey</button></div></div></div>}

    {modal === 'hotel' && hotel && <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/65 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="hotel-editor-title"><div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col bg-[#f7f0e5] shadow-2xl sm:my-8 sm:min-h-0 sm:rounded-lg"><div className="mobile-safe-top sticky top-0 z-10 flex justify-between border-b border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:rounded-t-lg sm:p-7"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">Accommodation</p><h3 id="hotel-editor-title" className="mt-1 text-2xl font-black sm:mt-2 sm:text-3xl">Edit hotel details</h3></div><button type="button" onClick={() => setModal(null)} className="grid h-12 w-12 place-items-center rounded-full hover:bg-black/10" aria-label="Close"><X /></button></div><div className="grid flex-1 gap-4 p-4 sm:grid-cols-2 sm:p-7"><Input label="Hotel name" value={hotel.hotelName} onChange={(value) => setHotel({ ...hotel, hotelName: value })} /><Input label="Booking reference" value={hotel.bookingReference} onChange={(value) => setHotel({ ...hotel, bookingReference: value })} /><div className="sm:col-span-2"><Input label="Address" value={hotel.address} onChange={(value) => setHotel({ ...hotel, address: value })} /></div><Input label="Check-in" type="datetime-local" value={hotel.checkInAt} onChange={(value) => setHotel({ ...hotel, checkInAt: value })} /><Input label="Check-out" type="datetime-local" value={hotel.checkOutAt} onChange={(value) => setHotel({ ...hotel, checkOutAt: value })} />{financialAccess !== 'hidden' && <Input label="Paid by" disabled={financialAccess !== 'edit'} value={hotel.payer} onChange={(value) => setHotel({ ...hotel, payer: value })} />}<Input label="Confirmation link" type="url" value={hotel.confirmationUrl} onChange={(value) => setHotel({ ...hotel, confirmationUrl: value })} />{financialAccess !== 'hidden' && <><Input label="Outstanding balance" type="number" disabled={financialAccess !== 'edit'} value={hotel.outstandingBalance} onChange={(value) => setHotel({ ...hotel, outstandingBalance: value })} /><Input label="Currency" disabled={financialAccess !== 'edit'} value={hotel.currency} onChange={(value) => setHotel({ ...hotel, currency: value.toUpperCase().slice(0, 3) })} /></>}<Notes label="Rooming notes" value={hotel.roomingNotes} onChange={(value) => setHotel({ ...hotel, roomingNotes: value })} /><Notes label="Breakfast" value={hotel.breakfastNotes} onChange={(value) => setHotel({ ...hotel, breakfastNotes: value })} /><Notes label="Hotel parking" value={hotel.parkingNotes} onChange={(value) => setHotel({ ...hotel, parkingNotes: value })} /></div><div className="mobile-safe-bottom sticky bottom-0 grid grid-cols-2 gap-3 border-t border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:flex sm:justify-end sm:rounded-b-lg sm:p-7"><button type="button" onClick={() => setModal(null)} className="min-h-12 rounded-md border border-[#bdb5aa] px-5 py-3 font-bold sm:min-h-11">Cancel</button><button type="button" disabled={saving} onClick={() => { const body: Record<string, unknown> = { ...hotel, checkInAt: instantFromLocal(hotel.checkInAt), checkOutAt: instantFromLocal(hotel.checkOutAt) }; if (financialAccess !== 'edit') { delete body.payer; delete body.outstandingBalance; delete body.currency; } void save('accommodation', body); }} className="min-h-12 rounded-md bg-[#e74428] px-6 py-3 font-bold text-white disabled:opacity-40 sm:min-h-11">Save accommodation</button></div></div></div>}
  </section>;
}
