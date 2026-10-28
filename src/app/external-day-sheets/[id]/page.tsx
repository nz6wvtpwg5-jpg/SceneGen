'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import AdvanceChecklist from '@/components/shows/AdvanceChecklist';
import DailyItinerary from '@/components/shows/DailyItinerary';
import TravelAccommodation from '@/components/shows/TravelAccommodation';
import DocumentVault from '@/components/shows/DocumentVault';
import ShowUpdates from '@/components/shows/ShowUpdates';
import BandMemberDaySheet from '@/components/shows/BandMemberDaySheet';
import { SceneGenWordmark } from '@/components/brand/scene-gen-mark';

type Show = Record<string, unknown> & { festivalName?: string; venueName?: string; venueCity?: string };
type Permissions = { editScope: 'none' | 'advance' | 'full'; financialAccess: 'hidden' | 'view' | 'edit'; accessRole?: 'collaborator' | 'band_member' | 'crew_member'; requireApproval?: boolean };
type Field = { source: string; target: string; label: string; type?: 'date' | 'time' | 'tel' | 'email' | 'number'; multiline?: boolean; required?: boolean };

const operational: Field[] = [
  { source: 'showDate', target: 'date', label: 'Date', type: 'date', required: true },
  { source: 'festivalName', target: 'festivalName', label: 'Festival / event name' },
  { source: 'venueName', target: 'venueName', label: 'Venue' },
  { source: 'venueAddress', target: 'venueAddress', label: 'Address' },
  { source: 'venueCity', target: 'city', label: 'City' },
  { source: 'venueState', target: 'state', label: 'State / region' },
  { source: 'venueCountry', target: 'country', label: 'Country' },
  { source: 'loadInTime', target: 'loadInTime', label: 'Load in', type: 'time' },
  { source: 'soundCheckTime', target: 'soundCheckTime', label: 'Soundcheck', type: 'time' },
  { source: 'doorsTime', target: 'doorTime', label: 'Doors', type: 'time' },
  { source: 'showTime', target: 'startTime', label: 'Stage time', type: 'time' },
  { source: 'endTime', target: 'endTime', label: 'Finish', type: 'time' },
  { source: 'contactName', target: 'promoterName', label: 'Promoter' },
  { source: 'contactPhone', target: 'promoterPhone', label: 'Promoter phone', type: 'tel' },
  { source: 'contactEmail', target: 'promoterEmail', label: 'Promoter email', type: 'email' },
  { source: 'venueCapacity', target: 'capacity', label: 'Capacity', type: 'number' },
  { source: 'notes', target: 'notes', label: 'Notes', multiline: true },
];

const financial: Field[] = [
  { source: 'currency', target: 'currency', label: 'Currency' },
  { source: 'fee', target: 'fee', label: 'Fee', type: 'number' },
  { source: 'guaranteedFee', target: 'guaranteedFee', label: 'Guaranteed fee', type: 'number' },
  { source: 'ticketPrice', target: 'ticketPrice', label: 'Ticket price', type: 'number' },
  { source: 'backendDeal', target: 'backendDeal', label: 'Backend deal' },
];

function fieldValues(show: Show) {
  return Object.fromEntries([...operational, ...financial].map((field) => {
    const value = show[field.source];
    if (field.type === 'date' && typeof value === 'string') return [field.target, value.slice(0, 10)];
    if (field.type === 'time' && typeof value === 'string') return [field.target, value.slice(0, 5)];
    return [field.target, value == null ? '' : String(value)];
  }));
}

type DaySheetPageProps = { apiBase?: string; backHref?: string; backLabel?: string; contextLabel?: string };

export function DaySheetPage({ apiBase = '/api/collaborator/shows', backHref = '/external-day-sheets', backLabel = 'All day sheets', contextLabel = 'External day sheet' }: DaySheetPageProps) {
  const { id } = useParams<{ id: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Unable to load day sheet');
        const loaded = (data.show || data) as Show;
        const values = fieldValues(loaded);
        setShow(loaded); setPermissions(data.permissions || null); setForm(values); setOriginal(values);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to load day sheet'));
  }, [apiBase, id]);

  async function save() {
    if (!permissions) return;
    setSaving(true); setError(''); setMessage('');
    const editable = [...(permissions.editScope === 'none' ? [] : operational), ...(permissions.financialAccess === 'edit' ? financial : [])];
    const changed = editable.filter((field) => form[field.target] !== original[field.target]);
    if (!changed.length) { setSaving(false); setMessage('No changes to save.'); return; }
    const missing = changed.find((field) => field.required && !form[field.target]);
    if (missing) { setSaving(false); setError(`${missing.label} is required.`); return; }
    if (changed.some((field) => field.type === 'number' && form[field.target] !== '' && !Number.isFinite(Number(form[field.target])))) {
      setSaving(false); setError('Enter valid numeric values.'); return;
    }
    if (changed.some((field) => field.target === 'currency' && form.currency !== '' && !/^[A-Za-z]{3}$/.test(form.currency))) {
      setSaving(false); setError('Currency must be a three-letter code.'); return;
    }
    const payload = Object.fromEntries(changed.map((field) => {
      const raw = form[field.target] ?? '';
      if (field.type === 'number') return [field.target, raw === '' ? null : Number(raw)];
      if (field.type === 'time') return [field.target, raw || null];
      if (field.target === 'currency') return [field.target, raw ? raw.toUpperCase() : null];
      return [field.target, raw];
    }));
    try {
      const response = await fetch(`${apiBase}/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Day sheet could not be saved');
      if (data.pendingApproval) { setOriginal({ ...form }); setMessage('Changes submitted for approval.'); }
      else {
        const updated = (data.show || show) as Show;
        const values = fieldValues(updated);
        setShow(updated); setForm(values); setOriginal(values); setMessage('Day sheet saved.');
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Day sheet could not be saved'); }
    finally { setSaving(false); }
  }

  if (error && !show) return <main className="grid min-h-[100dvh] place-items-center bg-[#f3ede3] p-4 sm:p-8"><div className="mx-auto max-w-3xl rounded-2xl bg-[#fff1ec] p-6 font-semibold">{error}</div></main>;
  if (!show || !permissions) return <main className="grid min-h-[100dvh] place-items-center bg-[#f3ede3] p-6 text-center">Loading day sheet…</main>;

  const operationalEdit = permissions.editScope !== 'none';
  const bandMember = ['band_member', 'crew_member'].includes(permissions.accessRole || '');
  const financialEdit = permissions.financialAccess === 'edit';
  const visibleOperational = bandMember ? operational.filter((field) => !['contactName', 'contactPhone', 'contactEmail', 'notes'].includes(field.source)) : operational;
  const control = (field: Field, editable: boolean) => <label key={field.target} className={field.multiline ? 'sm:col-span-2' : ''}><span className="mb-2 block text-xs font-black uppercase tracking-[.1em] text-[#686258]">{field.label}</span>{!editable && field.type === 'date' ? <span className="inline-flex min-h-11 w-auto max-w-full items-center rounded-full border border-[#d8d0c3] bg-[#f2ebe0] px-4 text-base font-bold">{form[field.target] ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${form[field.target]}T00:00:00Z`)) : 'Not set'}</span> : field.multiline ? <textarea rows={5} disabled={!editable} value={form[field.target] || ''} onChange={(event) => setForm({ ...form, [field.target]: event.target.value })} className="w-full rounded-xl border border-[#d8d0c3] bg-white p-3 text-base disabled:bg-[#f2ebe0]"/> : <input type={field.type || 'text'} required={field.required} disabled={!editable} value={form[field.target] || ''} onChange={(event) => setForm({ ...form, [field.target]: event.target.value })} className="h-12 w-full rounded-xl border border-[#d8d0c3] bg-white px-3 text-base disabled:bg-[#f2ebe0]"/>}</label>;

  return <main className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-[#f3ede3] pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12">
    <nav className="mobile-safe-top sticky top-0 z-40 w-full max-w-full overflow-x-clip border-b border-white/10 bg-[#11130f]/95 text-white backdrop-blur"><div className="mx-auto flex min-h-14 w-full min-w-0 max-w-5xl items-center justify-between gap-3 px-4 sm:min-h-16 sm:px-6"><div className="min-w-0 overflow-hidden"><SceneGenWordmark compact /></div><Link href={backHref} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/15 px-3 text-xs font-bold text-white/75 hover:text-white"><ArrowLeft size={17}/><span className="sm:hidden">Back</span><span className="hidden sm:inline">{backLabel}</span></Link></div></nav>
    <div className="mx-auto w-full min-w-0 max-w-4xl px-3 py-3 sm:px-6 sm:py-5 md:py-10">
      {!bandMember && <div className="mt-5"><ShowUpdates showId={id} endpoint={`${apiBase}/${encodeURIComponent(id)}`} /></div>}
      {bandMember ? <BandMemberDaySheet showId={id} apiBase={apiBase} show={show} roleLabel={permissions.accessRole === 'crew_member' ? 'Crew member' : 'Band member'} /> : <>
      <div className="mt-5 rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] p-4 shadow-sm sm:rounded-3xl sm:p-6 md:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff5738]">{bandMember ? 'Band member day sheet' : contextLabel}</p><h1 className="mt-2 text-3xl font-black">{show.festivalName || show.venueName || show.venueCity || 'Day sheet'}</h1>{show.festivalName && show.venueName && <p className="mt-2 font-bold text-[#686258]">{show.venueName}</p>}<p className="mt-3 text-sm font-semibold text-[#686258]">{bandMember ? 'Read only · Commercial details and documents are private' : `${permissions.editScope === 'none' ? 'View only' : permissions.editScope === 'advance' ? 'Advance editor' : 'Full day-sheet editor'} · Finances ${permissions.financialAccess === 'hidden' ? 'hidden' : permissions.financialAccess === 'edit' ? 'editable' : 'view only'}`}</p></div><ShieldCheck className="shrink-0 text-[#ff5738]"/></div>
        {permissions.requireApproval && (operationalEdit || financialEdit) && <p className="mt-5 rounded-xl bg-[#f2ebe0] p-4 text-sm font-semibold">Sensitive changes will be sent to the workspace for approval.</p>}
        <div className="mt-7 grid gap-5 sm:grid-cols-2">{visibleOperational.map((field) => control(field, operationalEdit))}</div>
        {permissions.financialAccess !== 'hidden' && <div className="mt-8 border-t border-[#d8d0c3] pt-7"><h2 className="text-xl font-black">Financial details</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">{financial.map((field) => control(field, financialEdit))}</div></div>}
        {error && <p className="mt-5 rounded-xl bg-[#fff1ec] p-4 font-semibold text-[#8a3426]">{error}</p>}
        {message && <p className="mt-5 rounded-xl bg-[#f1f6df] p-4 font-semibold text-[#44531f]">{message}</p>}
        {(operationalEdit || financialEdit) && <div className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-[#fffaf2]/95 p-3 backdrop-blur md:static md:mt-7 md:border-0 md:bg-transparent md:p-0"><div className="mx-auto max-w-4xl"><button disabled={saving} onClick={() => void save()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff5738] px-6 py-3 font-bold text-white disabled:opacity-50 md:w-auto"><Save size={17}/>{saving ? 'Saving…' : permissions.requireApproval ? 'Submit changes' : 'Save day sheet'}</button></div></div>}
      </div>
      <div className="mt-6"><DailyItinerary showId={id} endpoint={`${apiBase}/${encodeURIComponent(id)}/itinerary`} canEdit={operationalEdit} /></div>
      <div className="mt-6"><TravelAccommodation showId={id} endpoint={`${apiBase}/${encodeURIComponent(id)}/logistics`} canEdit={operationalEdit} financialAccess={permissions.financialAccess} /></div>
      {!bandMember && <div className="mt-6"><DocumentVault showId={id} endpoint={`${apiBase}/${encodeURIComponent(id)}/documents`} canEdit={operationalEdit} financialAccess={permissions.financialAccess} /></div>}
      <div className="mt-6"><AdvanceChecklist showId={id} endpoint={`${apiBase}/${encodeURIComponent(id)}/advance`} canEdit={operationalEdit} /></div>
      </>}
    </div>
  </main>;
}

export default function ExternalDaySheetPage() {
  return <DaySheetPage />;
}
