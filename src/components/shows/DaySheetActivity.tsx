'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, History, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { getEntityId } from '@/lib/entity';

type Change = { id: string; changes: Record<string, { old: unknown; new: unknown }>; status: 'pending' | 'applied' | 'rejected' | 'reverted'; actor_external: boolean; actor_name: string; reviewer_name?: string; created_at: string };
const LABELS: Record<string, string> = { venueName: 'Venue', venueAddress: 'Venue address', city: 'City', state: 'Region', country: 'Country', date: 'Show date', startTime: 'On stage', endTime: 'Finish', loadInTime: 'Load-in', soundCheckTime: 'Soundcheck', doorTime: 'Doors', status: 'Status', notes: 'Notes', capacity: 'Capacity', promoterName: 'Contact', promoterEmail: 'Contact email', promoterPhone: 'Contact phone', fee: 'Fee', guaranteedFee: 'Guarantee', backendDeal: 'Deal', isPaid: 'Payment status', ticketPrice: 'Ticket price', currency: 'Currency' };
const display = (value: unknown) => value === null || value === undefined || value === '' ? 'Not set' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);

export default function DaySheetActivity({ showId, onChanged }: { showId: string; onChanged: () => void }) {
  const [items, setItems] = useState<Change[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [busy, setBusy] = useState('');
  const entityId = getEntityId();
  const load = useCallback(async () => {
    const response = await fetch(`/api/shows/${showId}/activity`, { cache: 'no-store', headers: entityId ? { 'X-Entity-Id': entityId } : {} });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Activity could not be loaded');
    setItems(data.changes || []);
    setCanReview(Boolean(data.canReview));
  }, [showId, entityId]);
  useEffect(() => { void load().catch((error) => toast.error(error.message)); }, [load]);

  async function act(item: Change, action: 'approve' | 'reject' | 'revert') {
    setBusy(item.id + action);
    const path = action === 'revert' ? `/api/shows/${showId}/changes/${item.id}/revert` : `/api/shows/${showId}/change-requests/${item.id}/${action}`;
    const response = await fetch(path, { method: 'POST', headers: entityId ? { 'X-Entity-Id': entityId } : {} });
    const data = await response.json();
    setBusy('');
    if (!response.ok) return toast.error(data.error?.message || 'That change could not be processed');
    toast.success(action === 'approve' ? 'Change approved' : action === 'reject' ? 'Change rejected' : 'Change restored');
    await load();
    onChanged();
  }

  return <section className="day-sheet-no-print mt-6 rounded-3xl border border-[#d8d0c3] bg-[#fffaf2] p-7"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><History className="text-[#ff5738]"/><div><h2 className="text-2xl font-black">Activity & approvals</h2><p className="mt-1 text-sm text-[#686258]">A permanent record of who changed what.</p></div></div>{items.some((item) => item.status === 'pending') && <span className="rounded-full bg-[#ff5738] px-3 py-1 text-xs font-black text-white">Approval needed</span>}</div>
    {!items.length ? <p className="mt-6 text-sm text-[#777267]">No changes have been recorded yet.</p> : <div className="mt-5 divide-y divide-[#ddd4c7]">{items.map((item) => <article key={item.id} className="py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{item.actor_name}{item.actor_external ? ' · External collaborator' : ''}</p><p className="mt-1 text-xs text-[#777267]">{new Date(item.created_at).toLocaleString()} · <span className={item.status === 'pending' ? 'font-bold text-[#d64528]' : ''}>{item.status}</span></p></div>{canReview && <div className="flex gap-2">{item.status === 'pending' && <><button disabled={Boolean(busy)} onClick={() => void act(item, 'reject')} className="inline-flex items-center gap-1 rounded-full border border-[#c8beb0] px-3 py-2 text-xs font-bold"><X size={14}/> Reject</button><button disabled={Boolean(busy)} onClick={() => void act(item, 'approve')} className="inline-flex items-center gap-1 rounded-full bg-[#171713] px-3 py-2 text-xs font-bold text-white"><Check size={14}/> Approve</button></>}{item.status === 'applied' && <button disabled={Boolean(busy)} onClick={() => void act(item, 'revert')} className="inline-flex items-center gap-1 rounded-full border border-[#c8beb0] px-3 py-2 text-xs font-bold"><RotateCcw size={14}/> Restore previous values</button>}</div>}</div><div className="mt-3 grid gap-2">{Object.entries(item.changes).map(([field, change]) => <div key={field} className="rounded-xl bg-[#f2ebe0] px-4 py-3 text-sm"><strong>{LABELS[field] || field}</strong><span className="ml-2 text-[#777267]">{display(change.old)} → </span><span className="font-semibold">{display(change.new)}</span></div>)}</div></article>)}</div>}
  </section>;
}
