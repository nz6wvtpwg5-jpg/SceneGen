'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, CircleAlert, Handshake, MapPin, MessageSquareText, X } from 'lucide-react';
import { getEntityId } from '@/lib/entity';
import { normaliseProposal, type ProposalStatus, type ShowProposal } from '@/types/show-proposal';

type Decision = 'accepted' | 'declined' | 'changes_requested';
const statusStyle: Record<ProposalStatus, string> = {
  pending: 'bg-[#fff0bf] text-[#775b00]', changes_requested: 'bg-[#e5e1d8] text-[#625e55]',
  accepted: 'bg-[#e6efd3] text-[#536b14]', declined: 'bg-[#f5dfd9] text-[#9d311e]', withdrawn: 'bg-[#e5e1d8] text-[#625e55]',
};
const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);

export default function ShowProposalsPage() {
  const [proposals, setProposals] = useState<ShowProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'open' | 'decided'>('open');
  const [decisionTarget, setDecisionTarget] = useState<{ proposal: ShowProposal; decision: Decision } | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const entityId = getEntityId();
    if (!entityId) { setError('Choose a workspace before reviewing offers.'); setLoading(false); return; }
    try {
      const response = await fetch(`/api/show-proposals?entityId=${encodeURIComponent(entityId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to load offers');
      setProposals((data.proposals || []).map(normaliseProposal));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load offers'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => proposals.filter((proposal) => filter === 'open' ? ['pending', 'changes_requested'].includes(proposal.status) : !['pending', 'changes_requested'].includes(proposal.status)), [filter, proposals]);
  const openCount = proposals.filter((proposal) => ['pending', 'changes_requested'].includes(proposal.status)).length;

  function openDecision(proposal: ShowProposal, decision: Decision) { setNote(''); setDecisionTarget({ proposal, decision }); }
  async function decide(event: React.FormEvent) {
    event.preventDefault();
    if (!decisionTarget) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/show-proposals/${encodeURIComponent(decisionTarget.proposal.id)}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: decisionTarget.decision, note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to update this offer');
      const updated = normaliseProposal(data.proposal);
      setProposals((current) => current.map((proposal) => proposal.id === updated.id ? { ...proposal, ...updated } : proposal));
      setDecisionTarget(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update this offer'); }
    finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-8 lg:px-12">
    <header className="border-b border-[#d8d0c3] pb-6 sm:flex sm:items-end sm:justify-between sm:gap-6">
      <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-[#e74428]"><Handshake size={15}/> Booking offers</p><h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">Offers</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#686258]">Review pending day sheets proposed by authorised collaborators. Acceptance promotes the same record to a tentative show; declining removes the pending day sheet.</p></div>
      <div className="mt-5 rounded-lg bg-[#171713] px-5 py-4 text-white sm:mt-0"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#ff8068]">Awaiting review</p><p className="mt-1 text-3xl font-black">{openCount}</p></div>
    </header>
    <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-[#d8d0c3] bg-[#e5ddd1] p-1" role="tablist">
      {([['open', `Open (${openCount})`], ['decided', `Decided (${proposals.length - openCount})`]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`min-h-12 rounded-md px-4 text-sm font-black ${filter === value ? 'bg-[#171713] text-white' : 'text-[#625e55]'}`}>{label}</button>)}
    </div>
    {error && <p role="alert" className="mt-5 flex items-start gap-2 rounded-md border border-[#f3a18f] bg-[#fff0eb] p-4 text-sm font-bold text-[#a82f1d]"><CircleAlert className="mt-0.5 shrink-0" size={17}/>{error}</p>}
    {loading ? <p className="mt-6 bg-[#fffaf2] p-6">Loading offers…</p> : !visible.length ? <div className="mt-6 rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-8 text-center"><Handshake className="mx-auto text-[#b0a89c]"/><h2 className="mt-3 text-xl font-black">No {filter} offers</h2><p className="mt-2 text-sm text-[#686258]">New agent proposals will appear here for review.</p></div> : <div className="mt-6 grid gap-4">{visible.map((proposal) => <article key={proposal.id} className="overflow-hidden rounded-xl border border-[#d8d0c3] bg-[#fffaf2] shadow-sm">
      <div className="grid lg:grid-cols-[1fr_260px]"><div className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e74428]">{proposal.proposedByName || proposal.proposedByEmail || 'Authorised collaborator'} · Revision {proposal.revision || 1}</p><h2 className="mt-2 text-2xl font-black">{proposal.venueName}</h2></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusStyle[proposal.status]}`}>{proposal.status.replaceAll('_', ' ')}</span></div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span className="flex items-center gap-2"><CalendarDays size={16} className="text-[#e74428]"/>{new Date(`${proposal.showDate.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span><span className="flex items-center gap-2"><MapPin size={16} className="text-[#e74428]"/>{[proposal.city, proposal.region, proposal.country].filter(Boolean).join(', ')}</span></div><p className="mt-2 text-xs text-[#7b7469]">{proposal.venueAddress}</p>
        <div className="mt-5 grid gap-4 border-t border-[#e2dbd0] pt-5 sm:grid-cols-2"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#80786e]">Offer</p><p className="mt-1 text-2xl font-black">{money(proposal.offerAmount, proposal.currency)}</p><p className="mt-1 text-xs capitalize text-[#686258]">{proposal.dealType.replaceAll('_', ' ')}</p></div><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#80786e]">Promoter / buyer</p><p className="mt-1 font-black">{proposal.promoterName || 'Not supplied'}</p><p className="mt-1 text-xs text-[#686258]">{proposal.promoterEmail || proposal.promoterPhone || ''}</p></div></div>
        <div className="mt-5 rounded-lg bg-[#f2ece2] p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#80786e]">Terms</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{proposal.offerTerms}</p>{proposal.notes && <><p className="mt-4 text-[9px] font-black uppercase tracking-[.16em] text-[#80786e]">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{proposal.notes}</p></>}</div>{proposal.decisionNote && <p className="mt-4 border-l-2 border-[#e74428] pl-3 text-sm"><strong>Decision note:</strong> {proposal.decisionNote}</p>}
        {proposal.events && proposal.events.length > 0 && <details className="mt-5 border-t border-[#e2dbd0] pt-4"><summary className="cursor-pointer text-xs font-black uppercase tracking-[.14em] text-[#625e55]">Offer history ({proposal.events.length})</summary><ol className="mt-3 space-y-3 border-l border-[#cfc6b9] pl-4">{proposal.events.slice().reverse().map((event) => <li key={event.id} className="text-xs leading-5 text-[#686258]"><strong className="capitalize text-[#171713]">{event.eventType.replaceAll('_', ' ')}</strong> by {event.actorName || event.actorEmail || 'SceneGen user'}<br/><time>{new Date(event.createdAt).toLocaleString()}</time>{event.note && <p className="mt-1 text-[#171713]">{event.note}</p>}</li>)}</ol></details>}
      </div>
        <aside className="flex flex-col justify-center gap-3 border-t border-[#e2dbd0] bg-[#f7f1e8] p-5 lg:border-l lg:border-t-0">{proposal.status === 'pending' ? <>{proposal.proposedShowId && <Link href={`/shows/${proposal.proposedShowId}`} className="flex min-h-12 items-center justify-center rounded-md border border-[#bdb4a7] px-4 text-sm font-black">Open pending day sheet</Link>}<button onClick={() => openDecision(proposal, 'accepted')} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#171713] px-4 text-sm font-black text-white"><Check size={17}/> Accept offer</button><button onClick={() => openDecision(proposal, 'changes_requested')} className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#bdb4a7] px-4 text-sm font-black"><MessageSquareText size={17}/> Request changes</button><button onClick={() => openDecision(proposal, 'declined')} className="min-h-12 rounded-md px-4 text-sm font-black text-[#a13927]">Decline</button></> : proposal.status === 'changes_requested' ? <>{proposal.proposedShowId && <Link href={`/shows/${proposal.proposedShowId}`} className="flex min-h-12 items-center justify-center rounded-md border border-[#bdb4a7] px-4 text-sm font-black">Open pending day sheet</Link>}<p className="text-center text-sm font-bold text-[#686258]">Waiting for the collaborator to revise this offer.</p></> : proposal.acceptedShowId ? <Link href={`/shows/${proposal.acceptedShowId}`} className="flex min-h-12 items-center justify-center rounded-md bg-[#171713] px-4 text-sm font-black text-white">Open accepted show</Link> : <p className="text-center text-sm text-[#686258]">This offer has been {proposal.status}.</p>}</aside></div>
    </article>)}</div>}

    {decisionTarget && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="decision-title"><form onSubmit={decide} className="mobile-safe-bottom w-full max-w-lg rounded-t-2xl bg-[#fffaf2] p-6 sm:rounded-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e74428]">Offer decision</p><h2 id="decision-title" className="mt-2 text-2xl font-black">{decisionTarget.decision === 'accepted' ? 'Accept this offer?' : decisionTarget.decision === 'declined' ? 'Decline this offer?' : 'What needs to change?'}</h2></div><button type="button" onClick={() => setDecisionTarget(null)} className="grid h-11 w-11 place-items-center rounded-full border border-black/10" aria-label="Close"><X size={18}/></button></div><p className="mt-3 text-sm text-[#686258]">{decisionTarget.proposal.venueName} · {money(decisionTarget.proposal.offerAmount, decisionTarget.proposal.currency)}</p><label className="mt-6 block text-[10px] font-black uppercase tracking-[.16em] text-[#625e55]">{decisionTarget.decision === 'accepted' ? 'Note (optional)' : 'Reason or requested changes'}<textarea autoFocus required={decisionTarget.decision !== 'accepted'} rows={4} value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 w-full rounded-md border border-[#d8d0c3] bg-white p-3 text-base outline-none focus:border-[#e74428]"/></label><p className="mt-3 text-xs leading-5 text-[#686258]">{decisionTarget.decision === 'accepted' ? 'The existing pending day sheet will become a tentative show without creating a duplicate.' : decisionTarget.decision === 'declined' ? 'The pending day sheet will be removed, while the proposal decision remains in the audit history.' : 'The collaborator will see this message beside the pending proposal.'}</p><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setDecisionTarget(null)} className="min-h-12 rounded-md border border-[#d8d0c3] font-black">Cancel</button><button disabled={saving || (decisionTarget.decision !== 'accepted' && !note.trim())} className={`min-h-12 rounded-md font-black text-white disabled:opacity-50 ${decisionTarget.decision === 'declined' ? 'bg-[#a13927]' : 'bg-[#171713]'}`}>{saving ? 'Saving…' : 'Confirm'}</button></div></form></div>}
  </div>;
}
