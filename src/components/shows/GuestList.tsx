'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ClipboardList, Download, Plus, Search, ShieldCheck, Trash2, UserCheck, UserRound, UsersRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { getEntityId } from '@/lib/entity';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';

type View = 'manage' | 'door' | 'promoter';
type PassType = 'guest' | 'aftershow' | 'all_access' | 'photo' | 'working';
type GuestRequest = {
  id: string; guestName: string; requestedFor: string; allocationId?: string | null; plusOnes: number;
  partySize: number; passType: PassType; status: 'pending' | 'approved' | 'rejected';
  privateNote?: string | null; decisionNote?: string | null; checkedInAt?: string | null; createdAt: string;
};
type Allocation = { id: string; personName: string; allowance: number; used: number };
type GuestListData = {
  settings: { guestLimit: number | null; requestsOpen: boolean };
  summary: { approvedHeadcount: number; remaining: number | null };
  allocations: Allocation[]; requests: GuestRequest[]; passTypes: PassType[];
};

const passLabels: Record<PassType, string> = {
  guest: 'Guest', aftershow: 'Aftershow', all_access: 'All access', photo: 'Photo', working: 'Working',
};

function errorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object' || !('error' in data)) return fallback;
  const error = (data as { error?: unknown }).error;
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback;
}

export default function GuestList({ showId, canEdit, canDelete }: { showId: string; canEdit: boolean; canDelete: boolean }) {
  const [view, setView] = useState<View>('manage');
  const [data, setData] = useState<GuestListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [guestLimit, setGuestLimit] = useState('');
  const [requestsOpen, setRequestsOpen] = useState(true);
  const [allocationName, setAllocationName] = useState('');
  const [allowance, setAllowance] = useState(2);
  const [guestName, setGuestName] = useState('');
  const [requestedFor, setRequestedFor] = useState('');
  const [allocationId, setAllocationId] = useState('');
  const [plusOnes, setPlusOnes] = useState(0);
  const [passType, setPassType] = useState<PassType>('guest');
  const [privateNote, setPrivateNote] = useState('');
  const entityId = getEntityId();
  const confirmDialog = useConfirmDialog();
  const headers = useMemo<HeadersInit>(() => ({ ...(entityId ? { 'X-Entity-Id': entityId } : {}) }), [entityId]);

  const load = useCallback(async (selectedView: View) => {
    const response = await fetch(`/api/shows/${encodeURIComponent(showId)}/guest-list?view=${selectedView}`, { credentials: 'include', cache: 'no-store', headers });
    const result = await response.json();
    if (!response.ok) throw new Error(errorMessage(result, 'Guest list could not be loaded'));
    setData(result); setGuestLimit(result.settings.guestLimit == null ? '' : String(result.settings.guestLimit)); setRequestsOpen(result.settings.requestsOpen);
  }, [headers, showId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(view).catch((error) => toast.error(error.message)).finally(() => setLoading(false)), 0);
    return () => window.clearTimeout(timer);
  }, [load, view]);

  async function request(url: string, method: string, body?: unknown) {
    setSaving(true);
    try {
      const response = await fetch(url, { method, credentials: 'include', headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const result = await response.json();
      if (!response.ok) throw new Error(errorMessage(result, 'Guest list could not be updated'));
      await load(view); return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Guest list could not be updated'); return false; }
    finally { setSaving(false); }
  }

  function changeView(next: View) { setLoading(true); setView(next); }

  async function saveSettings() {
    const ok = await request(`/api/shows/${encodeURIComponent(showId)}/guest-list/settings`, 'PUT', { guestLimit: guestLimit === '' ? null : Number(guestLimit), requestsOpen });
    if (ok) toast.success('Guest-list settings saved');
  }

  async function addAllocation() {
    if (!allocationName.trim()) return;
    const ok = await request(`/api/shows/${encodeURIComponent(showId)}/guest-list/allocations`, 'POST', { personName: allocationName.trim(), allowance });
    if (ok) { setAllocationName(''); setAllowance(2); toast.success('Allowance added'); }
  }

  async function deleteAllocation(allocation: Allocation) {
    const confirmed = await confirmDialog({ title: `Remove ${allocation.personName}'s allowance?`, description: 'Existing guest requests remain, but they will no longer count against this personal allowance.', confirmLabel: 'Remove allowance', tone: 'destructive' });
    if (!confirmed) return;
    const ok = await request(`/api/shows/${encodeURIComponent(showId)}/guest-list/allocations/${encodeURIComponent(allocation.id)}`, 'DELETE');
    if (ok) toast.success('Allowance removed');
  }

  function selectAllocation(id: string) {
    setAllocationId(id);
    const allocation = data?.allocations.find((item) => item.id === id);
    if (allocation) setRequestedFor(allocation.personName);
  }

  async function addGuestRequest() {
    if (!guestName.trim() || !requestedFor.trim()) return;
    const ok = await request(`/api/shows/${encodeURIComponent(showId)}/guest-list/requests`, 'POST', {
      guestName: guestName.trim(), requestedFor: requestedFor.trim(), allocationId: allocationId || null,
      plusOnes, passType, privateNote: privateNote.trim() || null,
    });
    if (ok) { setGuestName(''); setRequestedFor(''); setAllocationId(''); setPlusOnes(0); setPassType('guest'); setPrivateNote(''); toast.success('Guest request added'); }
  }

  async function decide(item: GuestRequest, action: 'approve' | 'reject') {
    if (action === 'reject') {
      const confirmed = await confirmDialog({ title: `Reject ${item.guestName}?`, description: 'The request will remain in the private management history and will not appear at the door or in exports.', confirmLabel: 'Reject request', tone: 'destructive' });
      if (!confirmed) return;
    }
    const ok = await request(`/api/shows/${encodeURIComponent(showId)}/guest-list/requests/${encodeURIComponent(item.id)}`, 'PATCH', { action, passType: item.passType });
    if (ok) toast.success(action === 'approve' ? 'Guest approved' : 'Guest rejected');
  }

  async function checkIn(item: GuestRequest) {
    const action = item.checkedInAt ? 'undo_check_in' : 'check_in';
    const ok = await request(`/api/shows/${encodeURIComponent(showId)}/guest-list/requests/${encodeURIComponent(item.id)}`, 'PATCH', { action });
    if (ok) toast.success(action === 'check_in' ? `${item.guestName} checked in` : 'Check-in undone');
  }

  async function deleteGuestRequest(item: GuestRequest) {
    const confirmed = await confirmDialog({ title: `Permanently remove ${item.guestName}?`, description: 'The guest name, request and decision history will be deleted. This cannot be undone.', confirmLabel: 'Delete guest record', tone: 'destructive' });
    if (!confirmed) return;
    const ok = await request(`/api/shows/${encodeURIComponent(showId)}/guest-list/requests/${encodeURIComponent(item.id)}`, 'DELETE');
    if (ok) toast.success('Guest record deleted');
  }

  const filtered = view === 'manage' ? (data?.requests || []) : (data?.requests || []).filter((item) => item.guestName.toLowerCase().includes(search.trim().toLowerCase()));
  const pending = filtered.filter((item) => item.status === 'pending');
  const approved = filtered.filter((item) => item.status === 'approved');
  const rejected = filtered.filter((item) => item.status === 'rejected');

  return <section className="rounded-[22px] border border-[#d8d0c3] bg-[#fffaf2] p-4 shadow-[0_18px_50px_rgba(45,37,24,.07)] sm:rounded-lg sm:p-6 md:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#171713] text-white"><UsersRound size={18}/></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">Guest list and passes</p><h2 className="mt-1 text-2xl font-black">Door-ready guest management</h2><p className="mt-2 text-sm text-[#686258]">Approve within the venue cap, manage personal allowances and give the door only what it needs.</p></div></div>{view !== 'manage' && <label className="relative block min-w-56"><Search className="absolute left-3 top-3.5 text-[#777064]" size={17}/><span className="sr-only">Search guests</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search guests" className="h-12 w-full rounded-md border border-[#cfc6b9] bg-white pl-10 pr-3 text-base sm:text-sm"/></label>}</div>

    <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-[#eee6da] p-1" role="tablist" aria-label="Guest-list views">{([['manage','Manage',ClipboardList],['door','Door',UserCheck],['promoter','Promoter',ShieldCheck]] as const).map(([value,label,Icon]) => <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => changeView(value)} className={`flex min-h-12 items-center justify-center gap-2 rounded-md px-2 text-sm font-black ${view === value ? 'bg-white shadow-sm' : 'text-[#686258]'}`}><Icon size={16}/><span className="hidden xs:inline sm:inline">{label}</span></button>)}</div>

    {loading ? <p className="mt-6 text-sm text-[#686258]">Loading guest list…</p> : !data ? null : <>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-lg bg-[#171713] p-4 text-white"><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/55">Approved people</p><p className="mt-1 text-3xl font-black">{data.summary.approvedHeadcount}</p></div><div className="rounded-lg border border-[#d8d0c3] p-4"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#777064]">Remaining</p><p className="mt-1 text-3xl font-black">{data.summary.remaining == null ? '∞' : data.summary.remaining}</p></div><div className="col-span-2 rounded-lg border border-[#d8d0c3] p-4 sm:col-span-1"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#777064]">Requests</p><p className={`mt-1 text-lg font-black ${data.settings.requestsOpen ? 'text-[#577400]' : 'text-[#9b4939]'}`}>{data.settings.requestsOpen ? 'Open' : 'Closed'}</p></div></div>

      {view === 'manage' && <div className="mt-6 grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-5">
          <div className="rounded-xl border border-[#ddd4c7] bg-white/65 p-4"><h3 className="font-black">Limits and requests</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><label><span className="text-xs font-black uppercase">Venue guest limit</span><input type="number" min={0} max={5000} value={guestLimit} onChange={(event) => setGuestLimit(event.target.value)} placeholder="No overall limit" className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base"/></label><label className="flex min-h-12 items-center gap-3 rounded-md border border-[#cfc6b9] bg-white px-3 sm:mt-6 xl:mt-0"><input type="checkbox" checked={requestsOpen} onChange={(event) => setRequestsOpen(event.target.checked)} className="h-6 w-6 accent-[#e74428]"/><span className="font-bold">Accept new requests</span></label></div><button type="button" disabled={!canEdit || saving} onClick={() => void saveSettings()} className="mt-3 min-h-12 w-full rounded-md bg-[#171713] px-4 font-black text-white disabled:opacity-40">Save limits</button></div>

          <div className="rounded-xl border border-[#ddd4c7] bg-white/65 p-4"><h3 className="font-black">Per-person allowances</h3><p className="mt-1 text-xs text-[#686258]">Approved party sizes count against each person’s allocation.</p><div className="mt-3 grid grid-cols-[minmax(0,1fr)_90px] gap-2"><input aria-label="Person name" value={allocationName} onChange={(event) => setAllocationName(event.target.value)} maxLength={120} placeholder="Person or allocation" className="h-12 min-w-0 rounded-md border border-[#cfc6b9] bg-white px-3 text-base"/><input aria-label="Allowance" type="number" min={0} max={500} value={allowance} onChange={(event) => setAllowance(Number(event.target.value))} className="h-12 rounded-md border border-[#cfc6b9] bg-white px-3 text-base"/></div><button type="button" disabled={!canEdit || !allocationName.trim() || saving} onClick={() => void addAllocation()} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-[#171713] px-4 font-black disabled:opacity-40"><Plus size={16}/> Add allowance</button>{data.allocations.length > 0 && <div className="mt-4 divide-y divide-[#ddd4c7]">{data.allocations.map((item) => <div key={item.id} className="flex min-h-12 items-center justify-between gap-3 py-2"><div className="min-w-0"><p className="truncate font-bold">{item.personName}</p><p className={`text-xs ${item.used > item.allowance ? 'font-bold text-[#a83220]' : 'text-[#686258]'}`}>{item.used} of {item.allowance} used</p></div>{canDelete && <button type="button" onClick={() => void deleteAllocation(item)} className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-[#9b4939] hover:bg-[#fff1ec]" aria-label={`Remove ${item.personName}'s allowance`}><Trash2 size={16}/></button>}</div>)}</div>}</div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-[#ddd4c7] bg-white/65 p-4"><h3 className="font-black">New guest request</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label><span className="text-xs font-black uppercase">Guest name</span><input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={160} className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base"/></label><label><span className="text-xs font-black uppercase">Allowance</span><select value={allocationId} onChange={(event) => selectAllocation(event.target.value)} className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base"><option value="">No personal allowance</option>{data.allocations.map((item) => <option key={item.id} value={item.id}>{item.personName} — {item.allowance-item.used} left</option>)}</select></label><label><span className="text-xs font-black uppercase">Requested for</span><input value={requestedFor} onChange={(event) => setRequestedFor(event.target.value)} maxLength={120} placeholder="Band member, promoter…" className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base"/></label><label><span className="text-xs font-black uppercase">Plus-ones</span><input type="number" min={0} max={10} value={plusOnes} onChange={(event) => setPlusOnes(Number(event.target.value))} className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base"/></label><label><span className="text-xs font-black uppercase">Pass</span><select value={passType} onChange={(event) => setPassType(event.target.value as PassType)} className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base">{data.passTypes.map((type) => <option key={type} value={type}>{passLabels[type]}</option>)}</select></label><label><span className="text-xs font-black uppercase">Private note</span><input value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} maxLength={1000} placeholder="Never shown at the door" className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base"/></label></div><button type="button" disabled={!canEdit || !data.settings.requestsOpen || !guestName.trim() || !requestedFor.trim() || saving} onClick={() => void addGuestRequest()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#e74428] px-4 font-black text-white disabled:opacity-40"><Plus size={16}/> Add request</button></div>

          <div><h3 className="font-black">Pending approval <span className="text-[#777064]">({pending.length})</span></h3>{pending.length ? <div className="mt-3 space-y-3">{pending.map((item) => <div key={item.id} className="rounded-xl border border-[#e0d7ca] bg-white p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-lg font-black">{item.guestName}{item.plusOnes ? ` +${item.plusOnes}` : ''}</p><p className="mt-1 text-xs text-[#686258]">For {item.requestedFor} · {passLabels[item.passType]} · party of {item.partySize}</p>{item.privateNote && <p className="mt-2 rounded-md bg-[#f2ebe0] p-2 text-sm text-[#5f594f]">Private: {item.privateNote}</p>}</div>{canEdit && <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex"><button type="button" disabled={saving} onClick={() => void decide(item,'reject')} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#9b4939] px-4 font-black text-[#8b3021]"><X size={16}/> Reject</button><button type="button" disabled={saving} onClick={() => void decide(item,'approve')} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#171713] px-4 font-black text-white"><Check size={16}/> Approve</button></div>}</div></div>)}</div> : <p className="mt-3 rounded-lg bg-[#f2ebe0] p-4 text-sm text-[#686258]">No requests are waiting.</p>}</div>
          {(approved.length > 0 || rejected.length > 0) && <details className="rounded-xl border border-[#ddd4c7] bg-white/50 p-4"><summary className="cursor-pointer font-black">Decision history ({approved.length + rejected.length})</summary><div className="mt-3 divide-y divide-[#ddd4c7]">{[...approved,...rejected].map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="min-w-0"><strong>{item.guestName}{item.plusOnes ? ` +${item.plusOnes}` : ''}</strong><br/><span className="text-[#686258]">For {item.requestedFor} · {passLabels[item.passType]}</span></span><span className="ml-auto flex items-center gap-2"><span className={`font-black capitalize ${item.status === 'approved' ? 'text-[#577400]' : 'text-[#9b4939]'}`}>{item.status}</span>{canDelete && <button type="button" onClick={() => void deleteGuestRequest(item)} className="grid h-11 w-11 place-items-center rounded-md text-[#9b4939] hover:bg-[#fff1ec]" aria-label={`Delete ${item.guestName}'s guest record`}><Trash2 size={16}/></button>}</span></div>)}</div></details>}
        </div>
      </div>}

      {view === 'door' && <div className="mt-6"><div className="mb-4 flex items-center gap-2 text-sm text-[#686258]"><ShieldCheck size={17}/><span>Approved names and passes only. Private and decision notes are hidden.</span></div>{approved.length ? <div className="grid gap-3 md:grid-cols-2">{approved.map((item) => <button type="button" disabled={!canEdit || saving} onClick={() => void checkIn(item)} key={item.id} className={`flex min-h-24 items-center justify-between gap-4 rounded-xl border p-4 text-left transition ${item.checkedInAt ? 'border-[#8da72c] bg-[#f2f6df]' : 'border-[#d8d0c3] bg-white'}`}><span className="min-w-0"><span className="block truncate text-xl font-black">{item.guestName}{item.plusOnes ? ` +${item.plusOnes}` : ''}</span><span className="mt-1 block text-xs font-bold uppercase tracking-[.12em] text-[#686258]">Party of {item.partySize} · {passLabels[item.passType]}</span></span><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${item.checkedInAt ? 'bg-[#769000] text-white' : 'border-2 border-[#aaa397]'}`}>{item.checkedInAt ? <Check size={22}/> : <UserRound size={21}/>}</span></button>)}</div> : <p className="rounded-lg bg-[#f2ebe0] p-5 text-sm text-[#686258]">No approved guests match this search.</p>}</div>}

      {view === 'promoter' && <div className="mt-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="text-xl font-black">Promoter list</h3><p className="mt-1 text-sm text-[#686258]">Approved guests only, with no private notes or contact data.</p></div><a href={`/api/shows/${encodeURIComponent(showId)}/guest-list/export`} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#171713] px-5 font-black text-white"><Download size={16}/> Export CSV</a></div>{approved.length ? <div className="mt-4 overflow-hidden rounded-xl border border-[#d8d0c3]"><div className="hidden grid-cols-[minmax(0,2fr)_100px_140px_minmax(0,1fr)] gap-3 bg-[#eee6da] px-4 py-3 text-xs font-black uppercase tracking-[.12em] sm:grid"><span>Guest</span><span>Party</span><span>Pass</span><span>Requested for</span></div>{approved.map((item) => <div key={item.id} className="grid gap-1 border-t border-[#e0d7ca] bg-white px-4 py-4 first:border-t-0 sm:grid-cols-[minmax(0,2fr)_100px_140px_minmax(0,1fr)] sm:gap-3"><strong>{item.guestName}{item.plusOnes ? ` +${item.plusOnes}` : ''}</strong><span className="text-sm">Party of {item.partySize}</span><span className="text-sm font-semibold">{passLabels[item.passType]}</span><span className="text-sm text-[#686258]">{item.requestedFor}</span></div>)}</div> : <p className="mt-4 rounded-lg bg-[#f2ebe0] p-5 text-sm text-[#686258]">No approved guests match this search.</p>}</div>}
    </>}

    <div className="mt-5 flex items-start gap-2 border-t border-[#ddd4c7] pt-4 text-xs text-[#686258]"><ShieldCheck className="mt-0.5 shrink-0" size={15}/><p>SceneGen stores names and operational pass details only—no guest email addresses. Door and CSV views exclude private notes, and access stays inside this organisation.</p></div>
  </section>;
}
