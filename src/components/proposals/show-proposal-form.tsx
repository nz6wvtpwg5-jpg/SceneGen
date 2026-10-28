'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Handshake, MapPin, X } from 'lucide-react';
import PlacesAutocomplete from '@/components/ui/PlacesAutocomplete';
import type { ProposalWorkspace, ShowProposal } from '@/types/show-proposal';
import { normaliseProposal } from '@/types/show-proposal';

type Props = { workspaces: ProposalWorkspace[]; initialProposal?: ShowProposal | null; apiMode?: 'collaborator' | 'account'; onClose: () => void; onSaved: (proposal: ShowProposal) => void };

export function ShowProposalForm({ workspaces, initialProposal, apiMode = 'collaborator', onClose, onSaved }: Props) {
  const revising = Boolean(initialProposal);
  const [entityId, setEntityId] = useState(initialProposal?.entityId || workspaces[0]?.id || '');
  const [venueQuery, setVenueQuery] = useState(initialProposal?.venueName || '');
  const [venuePlaceId, setVenuePlaceId] = useState(initialProposal?.venuePlaceId || '');
  const [venueSummary, setVenueSummary] = useState(initialProposal?.venueAddress || '');
  const [showDate, setShowDate] = useState(initialProposal?.showDate?.slice(0, 10) || '');
  const [currency, setCurrency] = useState(initialProposal?.currency || 'EUR');
  const [offerAmount, setOfferAmount] = useState(initialProposal ? String(initialProposal.offerAmount) : '');
  const [dealType, setDealType] = useState(initialProposal?.dealType || 'guarantee');
  const [offerTerms, setOfferTerms] = useState(initialProposal?.offerTerms || '');
  const [notes, setNotes] = useState(initialProposal?.notes || '');
  const [promoterName, setPromoterName] = useState(initialProposal?.promoterName || '');
  const [promoterEmail, setPromoterEmail] = useState(initialProposal?.promoterEmail || '');
  const [promoterPhone, setPromoterPhone] = useState(initialProposal?.promoterPhone || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const minimumDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!venuePlaceId) return setError('Choose a venue from the Google Places results.');
    setSubmitting(true); setError('');
    try {
      const base = apiMode === 'account' ? '/api/show-proposals' : '/api/collaborator/show-proposals';
      const endpoint = initialProposal ? `${base}/${encodeURIComponent(initialProposal.id)}/revise` : base;
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId, venuePlaceId, showDate, currency, offerAmount: Number(offerAmount), dealType, offerTerms, notes, promoterName, promoterEmail, promoterPhone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to submit this proposal');
      onSaved(normaliseProposal(data.proposal));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit this proposal'); }
    finally { setSubmitting(false); }
  }

  const input = 'mt-2 h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 text-base outline-none focus:border-[#e74428] focus:ring-2 focus:ring-[#e74428]/10';
  const label = 'block text-[10px] font-black uppercase tracking-[.16em] text-[#625e55]';
  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-0 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="proposal-title">
    <form onSubmit={submit} className="mobile-safe-top mobile-safe-bottom mx-auto min-h-[100dvh] max-w-3xl bg-[#fffaf2] p-5 sm:min-h-0 sm:rounded-xl sm:p-8">
      <div className="flex items-start justify-between gap-5"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-[#e74428]"><Handshake size={15}/> {revising ? `Revision ${Number(initialProposal?.revision || 1) + 1}` : 'New offer'}</p><h2 id="proposal-title" className="mt-2 text-3xl font-black">{revising ? 'Revise the offer' : 'Propose a show'}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#686258]">{revising ? 'Update the pending day sheet and send the offer back to the band for another decision.' : "Submitting creates a pending day sheet in the band's workspace. It becomes a live tentative show only when the band accepts."}</p></div><button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/10" aria-label="Close"><X size={19}/></button></div>
      {revising && initialProposal?.decisionNote && <div className="mt-5 border-l-4 border-[#e74428] bg-[#fff0eb] p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#a82f1d]">Changes requested</p><p className="mt-2 text-sm leading-6">{initialProposal.decisionNote}</p></div>}
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className={label}>Band or workspace<select required disabled={revising} className={`${input} disabled:bg-[#eee8df]`} value={entityId} onChange={(e) => setEntityId(e.target.value)}>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
        <label className={label}>Show date<div className="relative"><CalendarDays className="pointer-events-none absolute left-4 top-5 text-[#e74428]" size={17}/><input required type="date" min={minimumDate} className={`${input} pl-11`} value={showDate} onChange={(e) => setShowDate(e.target.value)}/></div></label>
        <div className="sm:col-span-2"><span className={label}>Venue</span><div className="relative mt-2"><MapPin className="pointer-events-none absolute left-4 top-4 z-10 text-[#e74428]" size={17}/><PlacesAutocomplete value={venueQuery} onChange={(value) => { setVenueQuery(value); setVenuePlaceId(''); setVenueSummary(''); setError(''); }} onPlaceSelect={(place) => { setVenuePlaceId(place.place_id || ''); setVenueQuery(place.name || place.formatted_address || ''); setVenueSummary(place.formatted_address || ''); setError(''); }} placeholder="Start typing a venue, then choose the correct result" className="h-12 w-full rounded-md border border-[#d8d0c3] bg-white pl-11 pr-4 text-base outline-none focus:border-[#e74428]"/></div>{venueSummary ? <p className="mt-2 text-xs font-semibold text-[#587400]">Verified venue: {venueSummary}</p> : <p className="mt-2 text-xs text-[#686258]">Required: type the venue name and select the correct result from the list.</p>}</div>
        <label className={label}>Currency<input required maxLength={3} pattern="[A-Za-z]{3}" className={`${input} uppercase`} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())}/></label>
        <label className={label}>Offer amount<input required type="number" min="0" step="0.01" inputMode="decimal" className={input} value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)}/></label>
        <label className={label}>Deal type<select required className={input} value={dealType} onChange={(e) => setDealType(e.target.value)}><option value="guarantee">Guarantee</option><option value="door_split">Door split</option><option value="guarantee_plus_percentage">Guarantee plus percentage</option><option value="festival_fee">Festival fee</option><option value="other">Other</option></select></label>
        <label className={label}>Promoter or buyer<input className={input} maxLength={255} value={promoterName} onChange={(e) => setPromoterName(e.target.value)}/></label>
        <label className={label}>Promoter email<input type="email" className={input} maxLength={255} value={promoterEmail} onChange={(e) => setPromoterEmail(e.target.value)}/></label>
        <label className={label}>Promoter phone<input type="tel" className={input} maxLength={50} value={promoterPhone} onChange={(e) => setPromoterPhone(e.target.value)}/></label>
        <label className={`${label} sm:col-span-2`}>Terms of the offer<textarea required rows={4} className={`${input} h-auto py-3`} placeholder="Guarantee, percentage, tax, accommodation, buyout, payment and any conditions" value={offerTerms} onChange={(e) => setOfferTerms(e.target.value)}/></label>
        <label className={`${label} sm:col-span-2`}>Notes<textarea rows={3} className={`${input} h-auto py-3`} placeholder="Anything else the band should consider" value={notes} onChange={(e) => setNotes(e.target.value)}/></label>
      </div>
      {error && <p role="alert" className="mt-5 rounded-md border border-[#f3a18f] bg-[#fff0eb] p-4 text-sm font-bold text-[#a82f1d]">{error}</p>}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-12 rounded-md border border-[#d8d0c3] px-6 font-black">Cancel</button><button disabled={submitting} className="min-h-12 rounded-md bg-[#e74428] px-7 font-black text-white disabled:opacity-50">{submitting ? 'Sending offer…' : revising ? 'Resubmit revised offer' : 'Send to band for approval'}</button></div>
    </form>
  </div>;
}
