'use client';

import { useCallback, useEffect, useState } from 'react';
import { BedDouble, Bus, Clock3, Coffee, MapPin, Pencil, Plane, Plus, Ship, Trash2, UsersRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { getEntityId } from '@/lib/entity';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';

type Category = 'call' | 'travel' | 'border' | 'flight' | 'ferry' | 'accommodation' | 'production' | 'performance' | 'meal' | 'other';
type ItineraryEvent = { id: string; title: string; category: Category; day_offset: number; event_time?: string | null; end_time?: string | null; location?: string | null; responsible_person?: string | null; notes?: string | null; system?: boolean };
type Draft = { title: string; category: Category; dayOffset: number; eventTime: string; endTime: string; location: string; responsiblePerson: string; notes: string };

const EMPTY: Draft = { title: '', category: 'call', dayOffset: 0, eventTime: '', endTime: '', location: '', responsiblePerson: '', notes: '' };
const labels: Record<Category, string> = { call: 'Call', travel: 'Travel', border: 'Border', flight: 'Flight', ferry: 'Ferry', accommodation: 'Hotel', production: 'Production', performance: 'Performance', meal: 'Meal', other: 'Other' };
const categoryIcon = (category: Category) => category === 'travel' || category === 'border' ? Bus
  : category === 'flight' ? Plane : category === 'ferry' ? Ship
    : category === 'accommodation' ? BedDouble : category === 'meal' ? Coffee
      : category === 'call' ? UsersRound : Clock3;
const dayLabel = (offset: number) => offset === 0 ? 'Show day' : offset === -1 ? 'Previous day'
  : offset === 1 ? 'Following day' : offset < 0 ? `${Math.abs(offset)} days before` : `${offset} days after`;

export default function DailyItinerary({ showId, endpoint, canEdit }: { showId: string; endpoint?: string; canEdit: boolean }) {
  const base = endpoint || `/api/shows/${encodeURIComponent(showId)}/itinerary`;
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<ItineraryEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const entityId = getEntityId();
  const confirmDialog = useConfirmDialog();
  const headers = useCallback((json = false): HeadersInit => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(entityId ? { 'X-Entity-Id': entityId } : {}),
  }), [entityId]);

  const load = useCallback(async () => {
    const response = await fetch(base, { cache: 'no-store', headers: headers() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Unable to load itinerary');
    setEvents(data.events || []);
  }, [base, headers]);

  useEffect(() => {
    void load().catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const refresh = () => void load().catch((error) => toast.error(error.message));
    window.addEventListener('scenegen:schedule-changed', refresh);
    return () => window.removeEventListener('scenegen:schedule-changed', refresh);
  }, [load]);

  function begin(event?: ItineraryEvent) {
    setEditing(event || null);
    setDraft(event ? {
      title: event.title, category: event.category, dayOffset: event.day_offset,
      eventTime: event.event_time?.slice(0, 5) || '', endTime: event.end_time?.slice(0, 5) || '',
      location: event.location || '', responsiblePerson: event.responsible_person || '', notes: event.notes || '',
    } : EMPTY);
    setOpen(true);
  }

  async function save() {
    if (!draft.title.trim()) return;
    const response = await fetch(editing ? `${base}/${encodeURIComponent(editing.id)}` : base, {
      method: editing ? 'PATCH' : 'POST',
      headers: headers(true),
      body: JSON.stringify(draft),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error?.message || 'Itinerary event could not be saved');
    const updated = Boolean(editing);
    setOpen(false);
    setEditing(null);
    setDraft(EMPTY);
    await load();
    toast.success(updated ? 'Itinerary event updated' : 'Itinerary event added');
  }

  async function archive(event: ItineraryEvent) {
    const confirmed = await confirmDialog({
      title: `Remove “${event.title}”?`,
      description: 'This custom event will no longer appear in the daily itinerary.',
      confirmLabel: 'Remove event',
      tone: 'destructive',
    });
    if (!confirmed) return;
    const response = await fetch(`${base}/${encodeURIComponent(event.id)}`, {
      method: 'PATCH', headers: headers(true), body: JSON.stringify({ archived: true }),
    });
    if (!response.ok) return toast.error('Itinerary event could not be removed');
    await load();
    toast.success('Itinerary event removed');
  }

  return (
    <section className="rounded-[22px] border border-[#d8d0c3] bg-[#fffaf2] p-4 shadow-[0_18px_50px_rgba(45,37,24,.07)] sm:rounded-lg sm:p-6 md:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">Daily operations</p><h2 className="mt-1 text-2xl font-black">Complete itinerary</h2><p className="mt-2 text-sm text-[#686258]">One chronological view of travel, calls, accommodation and the run of show.</p></div>
        {canEdit && <button type="button" onClick={() => begin()} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#171713] px-4 py-2.5 text-sm font-bold text-white sm:min-h-11"><Plus size={16} /> Add event</button>}
      </div>

      {loading ? <p className="mt-6 text-sm text-[#686258]">Loading itinerary...</p>
        : events.length ? <div className="relative mt-7 before:absolute before:bottom-4 before:left-[43px] before:top-4 before:w-px before:bg-[#d8d0c3] sm:before:left-[62px]">{events.map((event, index) => {
          const Icon = categoryIcon(event.category);
          const showDay = index === 0 || events[index - 1].day_offset !== event.day_offset;
          return <div key={event.id}>{showDay && <p className="mb-3 mt-5 pl-[66px] text-[10px] font-black uppercase tracking-[.18em] text-[#777064] first:mt-0 sm:pl-[88px]">{dayLabel(event.day_offset)}</p>}<div className="relative grid grid-cols-[34px_36px_minmax(0,1fr)] gap-2 py-3 sm:grid-cols-[52px_44px_minmax(0,1fr)] sm:gap-3">
            <p className="pt-2 text-right text-sm font-black tabular-nums">{event.event_time?.slice(0, 5) || '—'}</p>
            <span className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full ${event.system ? 'bg-[#e74428] text-white' : 'border border-[#d8d0c3] bg-[#fffaf2] text-[#5d584e]'}`}><Icon size={16} /></span>
            <div className="min-w-0 rounded-lg border border-[#e0d8cb] bg-white/60 p-3 sm:p-4"><div className="flex items-start justify-between gap-2 sm:gap-3"><div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="font-black">{event.title}</p><span className="rounded-full bg-[#f2ebe0] px-2 py-1 text-[10px] font-black uppercase text-[#686258]">{labels[event.category]}</span>{event.system && <span className="text-[10px] font-bold text-[#e74428]">From day sheet</span>}</div>
              {event.end_time && <p className="mt-1 text-xs text-[#777064]">Until {event.end_time.slice(0, 5)}</p>}
              {event.location && <p className="mt-2 flex items-center gap-2 break-words text-sm text-[#514d45]"><MapPin size={14} className="shrink-0" />{event.location}</p>}
              {event.responsible_person && <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-[#777064]"><UsersRound size={14} />{event.responsible_person}</p>}
              {event.notes && <p className="mt-2 break-words text-sm leading-6 text-[#686258]">{event.notes}</p>}
            </div>{canEdit && !event.system && <div className="flex shrink-0 flex-col sm:flex-row"><button type="button" onClick={() => begin(event)} className="grid h-11 w-11 place-items-center rounded-md hover:bg-[#f2ebe0]" aria-label={`Edit ${event.title}`} title="Edit event"><Pencil size={15} /></button><button type="button" onClick={() => void archive(event)} className="grid h-11 w-11 place-items-center rounded-md text-[#9b4939] hover:bg-[#fff1ec]" aria-label={`Remove ${event.title}`} title="Remove event"><Trash2 size={15} /></button></div>}</div></div>
          </div></div>;
        })}</div> : <p className="mt-6 border-l-2 border-[#b9afa0] bg-[#f2ebe0] p-5 text-sm text-[#686258]">No itinerary times have been added yet.</p>}

      {open && <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/65 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="itinerary-editor-title"><div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col bg-[#f7f0e5] shadow-2xl sm:my-10 sm:min-h-0 sm:rounded-lg">
        <div className="mobile-safe-top sticky top-0 z-10 flex items-start justify-between border-b border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:rounded-t-lg sm:p-7"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">Daily itinerary</p><h3 id="itinerary-editor-title" className="mt-1 text-2xl font-black sm:mt-2 sm:text-3xl">{editing ? 'Edit event' : 'Add event'}</h3></div><button type="button" onClick={() => setOpen(false)} className="grid h-12 w-12 place-items-center rounded-full hover:bg-black/10" aria-label="Close"><X /></button></div>
        <div className="grid flex-1 gap-4 p-4 [&_input]:text-base [&_select]:text-base [&_textarea]:text-base sm:grid-cols-2 sm:p-7 sm:[&_input]:text-sm sm:[&_select]:text-sm sm:[&_textarea]:text-sm">
          <label className="sm:col-span-2"><span className="text-xs font-black uppercase">Title</span><input autoFocus required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3" /></label>
          <label><span className="text-xs font-black uppercase">Type</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className="text-xs font-black uppercase">Day</span><select value={draft.dayOffset} onChange={(event) => setDraft({ ...draft, dayOffset: Number(event.target.value) })} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3">{Array.from({ length: 15 }, (_, index) => index - 7).map((offset) => <option key={offset} value={offset}>{dayLabel(offset)}</option>)}</select></label>
          <label><span className="text-xs font-black uppercase">Start time</span><input type="time" value={draft.eventTime} onChange={(event) => setDraft({ ...draft, eventTime: event.target.value })} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3" /></label>
          <label><span className="text-xs font-black uppercase">End time</span><input type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3" /></label>
          <label><span className="text-xs font-black uppercase">Location</span><input maxLength={300} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3" /></label>
          <label><span className="text-xs font-black uppercase">Responsible person</span><input maxLength={120} value={draft.responsiblePerson} onChange={(event) => setDraft({ ...draft, responsiblePerson: event.target.value })} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3" /></label>
          <label className="sm:col-span-2"><span className="text-xs font-black uppercase">Notes</span><textarea rows={4} maxLength={3000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-2 w-full rounded-md border border-[#d8d0c3] bg-white p-3" /></label>
        </div>
        <div className="mobile-safe-bottom sticky bottom-0 grid grid-cols-2 gap-3 border-t border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:flex sm:justify-end sm:rounded-b-lg sm:p-7"><button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-md border border-[#bdb5aa] px-5 py-3 font-bold sm:min-h-11">Cancel</button><button type="button" disabled={!draft.title.trim()} onClick={() => void save()} className="min-h-12 rounded-md bg-[#e74428] px-6 py-3 font-bold text-white disabled:opacity-40 sm:min-h-11">Save event</button></div>
      </div></div>}
    </section>
  );
}
