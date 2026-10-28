'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronDown, Clipboard, Globe2, Handshake, MapPin, Pencil, RefreshCw, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { getEntityId } from '@/lib/entity';
import CountryList from '@/components/ui/CountryList';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';
import { copyText } from '@/lib/clipboard';

const REGIONS = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];
const territoryLabel = (value: string) => value.startsWith('@region:') ? value.slice(8) : value;

type Collaborator = { id: string; kind: 'grant' | 'invite'; email: string; name?: string; access_role?: 'collaborator' | 'band_member' | 'crew_member'; access_level: string; edit_scope?: string; financial_access?: string; require_approval?: boolean; can_propose_shows?: boolean; scope_type: 'all' | 'countries' | 'tour' | 'show'; countries?: string[]; tour_id?: string; show_id?: string; scope_label: string; status: string; expires_at?: string; access_link?: string | null };
type PermissionDraft = { name: string; editScope: 'none' | 'advance' | 'full'; financialAccess: 'hidden' | 'view' | 'edit'; requireApproval: boolean; canProposeShows: boolean; scopeType: 'all' | 'countries' | 'tour' | 'show'; countries: string[]; tourId: string; showId: string };
type Choice = { id: string; name?: string; label?: string; date?: string; city?: string; country?: string };
type AgentRelationship = { id: string; status: 'requested' | 'changes_requested' | 'approved' | 'active' | 'paused' | 'ended' | 'declined'; email: string; display_name: string; agency_name?: string | null; commission_percentage?: number | null; decision_note?: string | null };

const showTime = (show: Choice) => {
  const timestamp = show.date ? Date.parse(show.date) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};
const newestShowsFirst = (choices: Choice[]) => [...choices].sort((left, right) =>
  showTime(right) - showTime(left) || String(left.label || '').localeCompare(String(right.label || ''))
);
const showDate = (value?: string) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not set' : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
};
function ShowChoicePicker({ shows, value, onChange }: { shows: Choice[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = shows.find((show) => show.id === value);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return shows;
    return shows.filter((show) => [show.label, show.city, show.country, show.date, showDate(show.date)].filter(Boolean).join(' ').toLowerCase().includes(needle));
  }, [query, shows]);

  return <div className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border bg-white px-4 py-3 text-left ${open ? 'border-[#ff5738] ring-2 ring-[#ff5738]/15' : 'border-[#d7cfc2]'}`}>
      <span className="flex min-w-0 items-center gap-3"><CalendarDays className="shrink-0 text-[#e74428]" size={20}/><span className="min-w-0">{selected ? <><strong className="block truncate text-sm">{selected.label || 'Day sheet'}</strong><span className="mt-0.5 block truncate text-xs text-[#686258]">{showDate(selected.date)}{selected.city ? ` · ${selected.city}${selected.country ? `, ${selected.country}` : ''}` : ''}</span></> : <><strong className="block text-sm">Choose a day sheet</strong><span className="mt-0.5 block text-xs text-[#686258]">Search by venue, city, country or date</span></>}</span></span>
      <ChevronDown size={19} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}/>
    </button>
    {open && <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-[#d7cfc2] bg-[#fffaf2] shadow-[0_22px_55px_rgba(23,23,19,.24)]">
      <label className="relative block border-b border-[#ddd4c7] p-3"><span className="sr-only">Search day sheets</span><Search size={17} className="pointer-events-none absolute left-7 top-7 text-[#777064]"/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${shows.length} day sheets…`} className="h-11 w-full rounded-lg border border-[#d7cfc2] bg-white pl-10 pr-4 text-base outline-none focus:border-[#ff5738] sm:text-sm"/></label>
      <div className="flex items-center justify-between bg-[#eee6da] px-4 py-2 text-[10px] font-black uppercase tracking-[.14em] text-[#686258]"><span>Newest show first</span><span>{matches.length} result{matches.length === 1 ? '' : 's'}</span></div>
      <div className="max-h-80 overflow-y-auto p-1">
        {matches.length ? matches.map((show) => <button key={show.id} type="button" onClick={() => { onChange(show.id); setOpen(false); setQuery(''); }} className={`grid min-h-16 w-full grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[#fff0eb] ${show.id === value ? 'bg-[#fff0eb]' : ''}`}>
          <span className="text-sm font-black tabular-nums">{showDate(show.date).replace(/\s\d{4}$/, '')}<span className="mt-0.5 block text-[10px] font-bold text-[#777064]">{show.date ? show.date.slice(0, 4) : 'No date'}</span></span>
          <span className="min-w-0"><strong className="block truncate text-sm">{show.label || 'Day sheet'}</strong><span className="mt-1 flex items-center gap-1 truncate text-xs text-[#686258]"><MapPin size={12} className="shrink-0"/>{[show.city, show.country].filter(Boolean).join(', ') || 'Location not set'}</span></span>
          {show.id === value && <Check size={17} className="text-[#e74428]"/>}
        </button>) : <p className="p-6 text-center text-sm text-[#686258]">No day sheets match “{query}”.</p>}
      </div>
    </div>}
  </div>;
}

export default function DaySheetCollaborators() {
  const [items, setItems] = useState<Collaborator[]>([]);
  const [previousCountries, setPreviousCountries] = useState<string[]>([]);
  const [tours, setTours] = useState<Choice[]>([]);
  const [shows, setShows] = useState<Choice[]>([]);
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [accessRole, setAccessRole] = useState<'collaborator' | 'band_member' | 'crew_member'>('collaborator');
  const restrictedTeamAccess = accessRole === 'band_member' || accessRole === 'crew_member';
  const [editScope, setEditScope] = useState<"none" | "advance" | "full">(
    "advance",
  );
  const [financialAccess, setFinancialAccess] = useState<
    "hidden" | "view" | "edit"
  >("hidden");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [requireApproval, setRequireApproval] = useState(true);
  const [canProposeShows, setCanProposeShows] = useState(true);
  const [inviteAsBookingAgent, setInviteAsBookingAgent] = useState(false);
  const [bookingAgentCommission, setBookingAgentCommission] = useState('');
  const [scopeType, setScopeType] = useState<
    "all" | "countries" | "tour" | "show"
  >("countries");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countryChoice, setCountryChoice] = useState("");
  const [tourId, setTourId] = useState("");
  const [showId, setShowId] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteEntityId, setInviteEntityId] = useState("");
  const [inviteRecipient, setInviteRecipient] = useState("");
  const [inviteEmailDelivered, setInviteEmailDelivered] = useState(false);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [draft, setDraft] = useState<PermissionDraft | null>(null);
  const [accessQuery, setAccessQuery] = useState('');
  const [accessStatus, setAccessStatus] = useState<'all' | 'active' | 'pending'>('all');
  const [expandedAccess, setExpandedAccess] = useState<string | null>(null);
  const [agentRelationships, setAgentRelationships] = useState<AgentRelationship[]>([]);
  const entityId = getEntityId();
  const confirmDialog = useConfirmDialog();
  const visibleAccess = useMemo(() => {
    const needle = accessQuery.trim().toLowerCase();
    return [...items]
      .filter((item) => accessStatus === 'all' || (accessStatus === 'pending' ? item.kind === 'invite' : item.kind === 'grant'))
      .filter((item) => !needle || [item.name, item.email, item.scope_label, item.access_role].filter(Boolean).join(' ').toLowerCase().includes(needle))
      .sort((left, right) => Number(left.kind === 'invite') - Number(right.kind === 'invite') || String(left.name || left.email).localeCompare(String(right.name || right.email)));
  }, [accessQuery, accessStatus, items]);

  const accessRoleLabel = (item: Collaborator) => item.access_role === 'band_member' ? 'Band member' : item.access_role === 'crew_member' ? 'Crew member' : 'Collaborator';
  const accessPermissionLabel = (item: Collaborator) => ['band_member', 'crew_member'].includes(item.access_role || '') ? 'Read only' : item.edit_scope === 'full' ? 'Full editor' : item.edit_scope === 'advance' ? 'Advance editor' : 'View only';

  const load = useCallback(async () => {
    if (!entityId) return;
    const [response, relationshipResponse] = await Promise.all([
      fetch(`/api/day-sheet-collaborators?entityId=${encodeURIComponent(entityId)}`, { headers: { "X-Entity-Id": entityId }, cache: "no-store" }),
      fetch(`/api/booking-agent/relationships?entityId=${encodeURIComponent(entityId)}`, { headers: { "X-Entity-Id": entityId }, cache: "no-store" }),
    ]);
    const [data, relationshipData] = await Promise.all([response.json(), relationshipResponse.json()]);
    if (!response.ok)
      throw new Error(data.error?.message || "Unable to load day-sheet access");
    setItems(data.collaborators || []);
    setPreviousCountries(data.countries || []);
    setTours(data.tours || []);
    setShows(newestShowsFirst(data.shows || []));
    if (!relationshipResponse.ok) throw new Error(relationshipData.error?.message || 'Unable to load booking-agent requests');
    setAgentRelationships(relationshipData.relationships || []);
  }, [entityId]);

  async function decideAgentRelationship(id: string, decision: 'approve' | 'decline') {
    if (!entityId) return;
    const confirmed = await confirmDialog({ title: decision === 'approve' ? 'Approve booking agent?' : 'Decline request?', description: decision === 'approve' ? 'This creates their booking-agent profile and adds this artist to their roster. Existing day-sheet permissions stay unchanged.' : 'Their existing day-sheet permissions will stay unchanged.', confirmLabel: decision === 'approve' ? 'Approve' : 'Decline', tone: decision === 'decline' ? 'destructive' : 'default' });
    if (!confirmed) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/booking-agent/relationships/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Entity-Id': entityId }, body: JSON.stringify({ entityId, decision }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to update the request');
      await load();
      toast.success(decision === 'approve' ? 'Request approved — they can now activate the booking-agent view' : 'Request declined');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update the request'); }
    finally { setBusy(false); }
  }

  async function removeAgentRelationship(relationship: AgentRelationship) {
    if (!entityId) return;
    const confirmed = await confirmDialog({
      title: 'Remove booking-agent status?',
      description: `${relationship.display_name || relationship.email} will no longer represent this band. Their separately granted day-sheet access will remain until you remove it below.`,
      confirmLabel: 'Remove booking agent',
      tone: 'destructive',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/booking-agent/relationships/${encodeURIComponent(relationship.id)}`, { method: 'DELETE', headers: { 'X-Entity-Id': entityId } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || 'Unable to remove booking-agent status');
      await load();
      toast.success('Booking-agent status removed');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to remove booking-agent status'); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    void load().catch((error) => toast.error(error.message));
  }, [load]);

  function resetInviteForm() {
    setRecipient("");
    setRecipientName("");
    setAccessRole('collaborator');
    setEditScope("advance");
    setFinancialAccess("hidden");
    setExpiresInDays(30);
    setRequireApproval(true);
    setCanProposeShows(true);
    setInviteAsBookingAgent(false);
    setBookingAgentCommission('');
    setScopeType("countries");
    setSelectedCountries([]);
    setCountryChoice("");
    setTourId("");
    setShowId("");
  }

  async function invite() {
    if (!entityId) return toast.error("Select a workspace first");
    const email = recipient.trim().toLowerCase();
    if (!recipientName.trim()) return toast.error("Enter the person’s name");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid email address");
    if (scopeType === 'countries' && selectedCountries.length === 0) return toast.error('Choose at least one country or continent');
    if (scopeType === 'tour' && !tourId) return toast.error('Choose a tour');
    if (scopeType === 'show' && !showId) return toast.error('Choose a day sheet');
    setBusy(true);
    setInviteUrl("");
    setInviteEmailDelivered(false);
    try {
      const response = await fetch("/api/day-sheet-collaborators/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Entity-Id": entityId,
        },
        body: JSON.stringify({
          entityId,
          name: recipientName,
          accessRole,
          email,
          editScope,
          financialAccess,
          requireApproval,
          canProposeShows,
          inviteAsBookingAgent,
          bookingAgentCommission,
          expiresInDays,
          scopeType,
          countries: selectedCountries,
          tourId,
          showId,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error?.message || "Invitation could not be created",
        );
      if (data.updatedExisting) {
        await load();
        setInviteUrl("");
        setInviteRecipient("");
        resetInviteForm();
        toast.success("Existing collaborator permissions updated");
        return;
      }
      const invitePath =
        typeof data.invitePath === "string" ? data.invitePath : "";
      setInviteUrl(
        invitePath ? `${window.location.origin}${invitePath}` : data.inviteUrl,
      );
      setInviteEntityId(entityId);
      setInviteRecipient(email);
      setInviteEmailDelivered(data.emailDelivery === "sent");
      await load();
      resetInviteForm();
      if (data.emailDelivery === "sent") toast.success("Invitation created and emailed");
      else toast.warning("Invitation created, but email delivery failed. Copy the private link below.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Invitation could not be created",
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(item: Collaborator) {
    if (!entityId) return;
    const confirmed = await confirmDialog({
      title: 'Remove day-sheet access?',
      description: `${item.email} will lose ${item.scope_label} access.`,
      confirmLabel: 'Remove access',
      tone: 'destructive',
    });
    if (!confirmed) return;
    const response = await fetch(
      `/api/day-sheet-collaborators/${item.kind}/${item.id}`,
      { method: "DELETE", headers: { "X-Entity-Id": entityId } },
    );
    if (!response.ok) return toast.error("Access could not be removed");
    setInviteUrl("");
    setInviteRecipient("");
    setInviteEmailDelivered(false);
    await load();
    toast.success("Access removed");
  }

  async function refreshAccessLink(item: Collaborator) {
    if (!entityId || item.kind !== 'invite') return;
    const confirmed = await confirmDialog({
      title: 'Refresh private access link?',
      description: `The existing link for ${item.email} will stop working immediately.`,
      confirmLabel: 'Refresh link',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/day-sheet-collaborators/invite/${item.id}/refresh-link`, {
        method: 'POST', headers: { 'X-Entity-Id': entityId },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Access link could not be refreshed');
      await load();
      toast.success('Access link refreshed. The old link no longer works.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Access link could not be refreshed');
    } finally { setBusy(false); }
  }

  function beginEdit(item: Collaborator) {
    setEditing(item);
    setDraft({
      name: item.name || "",
      editScope: (item.edit_scope as PermissionDraft["editScope"]) || "none",
      financialAccess:
        (item.financial_access as PermissionDraft["financialAccess"]) ||
        "hidden",
      requireApproval: item.require_approval !== false,
      canProposeShows: Boolean(item.can_propose_shows),
      scopeType: item.scope_type,
      countries: item.countries || [],
      tourId: item.tour_id || "",
      showId: item.show_id || "",
    });
  }

  function closeEditor() {
    if (busy) return;
    setEditing(null);
    setDraft(null);
  }

  async function savePermissions() {
    if (!entityId || !editing || !draft) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/day-sheet-collaborators/${editing.kind}/${editing.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Entity-Id": entityId,
          },
          body: JSON.stringify({
            ...draft,
            email: editing.email,
            originalScopeType: editing.scope_type,
            originalCountries: editing.countries || [],
            originalTourId: editing.tour_id || "",
            originalShowId: editing.show_id || "",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error?.message || "Permissions could not be updated",
        );
      setEditing(null);
      setDraft(null);
      await load();
      toast.success("Permissions updated");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Permissions could not be updated",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] p-4 shadow-[0_18px_50px_rgba(45,37,24,.07)] sm:rounded-3xl sm:p-6 md:p-8">
      <div className="mb-7 flex items-start gap-4">
        <div className="rounded-2xl bg-[#ff5738] p-3 text-white">
          <ShieldCheck />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#ff5738]">
            External collaborators
          </p>
          <h2 className="mt-1 text-3xl font-black tracking-[-.03em] text-[#171713]">
            Invite someone to your day sheets
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[#686258]">
            Their identity and access are defined together before the invitation is sent.
          </p>
        </div>
      </div>
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">Person’s name</span>
          <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} type="text" required autoComplete="name" maxLength={120} placeholder="Alex Smith" className="h-12 w-full rounded-xl border border-[#d7cfc2] bg-white px-4 text-base outline-none focus:border-[#ff5738] sm:text-sm"/>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">Email address</span>
          <input value={recipient} onChange={(event) => setRecipient(event.target.value)} type="email" required autoComplete="email" placeholder="agent@example.com" className="h-12 w-full rounded-xl border border-[#d7cfc2] bg-white px-4 text-base outline-none focus:border-[#ff5738] sm:text-sm"/>
        </label>
      </div>
      <fieldset className="mb-4 rounded-2xl border border-[#d8d0c3] bg-[#f4ede2] p-4">
        <legend className="px-2 text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">Access type</legend>
        <div className="grid gap-2 md:grid-cols-3">
          <label className={`flex min-h-24 cursor-pointer gap-3 rounded-xl border-2 bg-white p-4 transition-colors ${accessRole === 'collaborator' ? 'border-[#ff5738]' : 'border-transparent hover:border-[#d7cfc2]'}`}><input type="radio" name="access-role" checked={accessRole === 'collaborator'} onChange={() => setAccessRole('collaborator')} className="mt-1 h-5 w-5 accent-[#ff5738]"/><span><strong className="block">External collaborator</strong><span className="mt-1 block text-sm text-[#686258]">Configurable editing, financial and proposal permissions.</span></span></label>
          <label className={`flex min-h-24 cursor-pointer gap-3 rounded-xl border-2 bg-white p-4 transition-colors ${accessRole === 'band_member' ? 'border-[#ff5738]' : 'border-transparent hover:border-[#d7cfc2]'}`}><input type="radio" name="access-role" checked={accessRole === 'band_member'} onChange={() => { setAccessRole('band_member'); setEditScope('none'); setFinancialAccess('hidden'); setRequireApproval(false); setCanProposeShows(false); setInviteAsBookingAgent(false); }} className="mt-1 h-5 w-5 accent-[#ff5738]"/><span><strong className="block">Band member — day sheets only</strong><span className="mt-1 block text-sm text-[#686258]">Read-only schedule, flight, travel and accommodation details. No finances, promoter contacts, notes or documents.</span></span></label>
          <label className={`flex min-h-24 cursor-pointer gap-3 rounded-xl border-2 bg-white p-4 transition-colors ${accessRole === 'crew_member' ? 'border-[#ff5738]' : 'border-transparent hover:border-[#d7cfc2]'}`}><input type="radio" name="access-role" checked={accessRole === 'crew_member'} onChange={() => { setAccessRole('crew_member'); setEditScope('none'); setFinancialAccess('hidden'); setRequireApproval(false); setCanProposeShows(false); setInviteAsBookingAgent(false); }} className="mt-1 h-5 w-5 accent-[#ff5738]"/><span><strong className="block">Crew member — day sheets only</strong><span className="mt-1 block text-sm text-[#686258]">The same protected schedule, flight, travel and accommodation view as a band member.</span></span></label>
        </div>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        {accessRole === 'collaborator' && <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">
            Day-sheet access
          </span>
          <select
            value={editScope}
            onChange={(event) =>
              setEditScope(event.target.value as "none" | "advance" | "full")
            }
            className="h-12 w-full rounded-xl border border-[#d7cfc2] bg-white px-4"
          >
            <option value="advance">Edit advance information</option>
            <option value="none">View only</option>
            <option value="full">Edit entire day sheet</option>
          </select>
        </label>}
        {accessRole === 'collaborator' && <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">
            Financial access
          </span>
          <select
            value={financialAccess}
            onChange={(event) =>
              setFinancialAccess(
                event.target.value as "hidden" | "view" | "edit",
              )
            }
            className="h-12 w-full rounded-xl border border-[#d7cfc2] bg-white px-4"
          >
            <option value="hidden">Financial details hidden</option>
            <option value="view">Can view financial details</option>
            <option value="edit">Can view and edit financial details</option>
          </select>
        </label>}
        <label className={`block ${restrictedTeamAccess ? 'md:col-span-2' : ''}`}>
          <span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">
            Access expires
          </span>
          <select
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(Number(event.target.value))}
            className="h-12 w-full rounded-xl border border-[#d7cfc2] bg-white px-4"
          >
            <option value={7}>After 7 days</option>
            <option value={14}>After 14 days</option>
            <option value={30}>After 30 days</option>
            <option value={90}>After 90 days</option>
            <option value={365}>After one year</option>
          </select>
        </label>
      </div>
      {restrictedTeamAccess && <div className="mt-4 border-l-4 border-[#ff5738] bg-[#f4ede2] px-4 py-3 text-sm text-[#4f4a42]"><strong>{accessRole === 'crew_member' ? 'Crew-member' : 'Band-member'} protection:</strong> day sheets are read-only. Finances, promoter contacts, internal notes and documents stay hidden.</div>}
      {accessRole === 'collaborator' && editScope !== "none" && (
        <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[#d8d0c3] bg-white p-4">
          <input
            type="checkbox"
            checked={requireApproval}
            onChange={(event) => setRequireApproval(event.target.checked)}
            className="mt-1 h-5 w-5 accent-[#ff5738]"
          />
          <span>
            <strong className="block text-[#171713]">
              Require approval for sensitive changes
            </strong>
            <span className="mt-1 block text-sm text-[#686258]">
              Venue, schedule, status and financial edits enter your approval
              queue before changing the live day sheet.
            </span>
          </span>
        </label>
      )}
      {accessRole === 'collaborator' && ['all', 'countries'].includes(scopeType) && (
        <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[#d8d0c3] bg-white p-4">
          <input
            type="checkbox"
            checked={canProposeShows}
            onChange={(event) => setCanProposeShows(event.target.checked)}
            className="mt-1 h-5 w-5 accent-[#ff5738]"
          />
          <span>
            <strong className="flex items-center gap-2 text-[#171713]"><Handshake size={17}/> Can propose new shows</strong>
            <span className="mt-1 block text-sm text-[#686258]">Creates a pending day sheet within the assigned territories. The band must accept it before it becomes a live show.</span>
          </span>
        </label>
      )}
      {accessRole === 'collaborator' && <div className="mt-4 rounded-2xl border border-[#d8d0c3] bg-[#f4ede2] p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={inviteAsBookingAgent} onChange={(event) => setInviteAsBookingAgent(event.target.checked)} className="mt-1 h-5 w-5 accent-[#ff5738]" />
          <span>
            <strong className="flex items-center gap-2 text-[#171713]"><Handshake size={17}/> Invite as this band’s booking agent</strong>
            <span className="mt-1 block text-sm text-[#686258]">This is separate from day-sheet access. After accepting, they can activate the booking-agent view with this band on their roster.</span>
          </span>
        </label>
        {inviteAsBookingAgent && <label className="mt-4 block border-t border-[#d8d0c3] pt-4">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">Default commission (optional)</span>
          <div className="relative max-w-xs"><input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={bookingAgentCommission} onChange={(event) => setBookingAgentCommission(event.target.value)} className="h-12 w-full rounded-xl border border-[#d7cfc2] bg-white px-4 pr-10"/><span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-sm font-bold text-[#686258]">%</span></div>
        </label>}
      </div>}
      <div className="mt-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">
          Which day sheets?
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["all", "All day sheets"],
              ["countries", "Countries & continents"],
              ["tour", "One tour"],
              ["show", "One day sheet"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setScopeType(value);
                if (value === 'tour' || value === 'show') setCanProposeShows(false);
              }}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-bold ${scopeType === value ? "border-[#171713] bg-[#171713] text-white" : "border-[#d7cfc2] bg-white text-[#171713]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {scopeType === "countries" && (
        <div className="mt-4 rounded-2xl border border-[#d8d0c3] bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-[.1em] text-[#777267]">
            Continents
          </p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((region) => {
              const value = `@region:${region}`;
              const active = selectedCountries.includes(value);
              return (
                <button
                  key={region}
                  type="button"
                  disabled={active}
                  onClick={() =>
                    setSelectedCountries([...selectedCountries, value])
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-bold ${active ? "border-[#ff5738] bg-[#fff0eb] text-[#d83d20]" : "border-[#d1c8bb] bg-white"}`}
                >
                  {active && <Check size={14} className="mr-1 inline" />}
                  {region}
                  {region === "Europe" ? " (excluding UK)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {scopeType === "countries" && (
        <div className="mt-4 rounded-2xl border border-[#d8d0c3] bg-[#f4ede2] p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Globe2 size={17} /> Select individual countries
          </div>
          {previousCountries.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-[.1em] text-[#777267]">
                Previously selected territories
              </p>
              <div className="flex flex-wrap gap-2">
                {previousCountries.map((country) => {
                  const active = selectedCountries.includes(country);
                  return (
                    <button
                      key={country} aria-label={`Remove ${territoryLabel(country)}`}
                      type="button"
                      onClick={() => {
                        if (!active)
                          setSelectedCountries([...selectedCountries, country]);
                      }}
                      disabled={active}
                      className={`rounded-full border px-4 py-2 text-sm font-bold ${active ? "border-[#ff5738] bg-[#fff0eb] text-[#d83d20]" : "border-[#d1c8bb] bg-white text-[#171713]"}`}
                    >
                      {active && <Check size={14} className="mr-1 inline" />}
                      {territoryLabel(country)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-3">
            <CountryList
              value={countryChoice}
              onChange={(country) => {
                setCountryChoice("");
                if (country && !selectedCountries.includes(country))
                  setSelectedCountries([...selectedCountries, country]);
              }}
              className="h-12 w-full rounded-xl border border-[#d1c8bb] bg-white px-4 text-[#171713]"
            />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[.1em] text-[#777267]">
              Selected territories
            </p>
            {selectedCountries.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedCountries.map((country) => (
                  <button
                    key={country} aria-label={`Remove ${territoryLabel(country)}`}
                    type="button"
                    onClick={() =>
                      setSelectedCountries(
                        selectedCountries.filter((item) => item !== country),
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-[#ff5738] bg-[#fff0eb] px-4 py-2 text-sm font-bold text-[#d83d20]"
                  >
                    <Check size={14} /> {territoryLabel(country)}{" "}
                    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5 shrink-0"><path d="m6 6 12 12M18 6 6 18" /></svg>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#777267]">
                No territories selected yet.
              </p>
            )}
          </div>
        </div>
      )}
      {scopeType === "tour" && (
        <select
          value={tourId}
          onChange={(event) => setTourId(event.target.value)}
          className="mt-4 h-12 w-full rounded-xl border border-[#d7cfc2] bg-white px-4"
        >
          <option value="">Choose a tour…</option>
          {tours.map((tour) => (
            <option key={tour.id} value={tour.id}>
              {tour.name}
            </option>
          ))}
        </select>
      )}
      {scopeType === "show" && (
        <div className="mt-4">
          <ShowChoicePicker shows={shows} value={showId} onChange={setShowId}/>
          <p className="mt-2 text-sm text-[#686258]">Individual day-sheet access is allowed even when another person manages that territory.</p>
        </div>
      )}
      <div className="mt-5 rounded-2xl border border-[#d8d0c3] bg-[#f4ede2] p-4 text-sm text-[#4f4a42]">
        <strong>{recipient || "This person"}</strong> will have access to{" "}
        <strong>
          {scopeType === "show"
            ? "one selected day sheet"
            : scopeType === "tour"
              ? "one selected tour"
              : scopeType === "countries"
                ? "the selected countries"
                : "all day sheets"}
        </strong>
        . They{" "}
        {editScope === "none"
          ? "can view but not edit"
          : editScope === "advance"
            ? "can edit advance information"
            : "can edit the entire day sheet"}
        ; financial details are{" "}
        {financialAccess === "hidden"
          ? "hidden"
          : financialAccess === "view"
            ? "view only"
            : "editable"}
        {editScope !== "none" && requireApproval
          ? "; sensitive edits require approval"
          : ""}
        {canProposeShows && ['all', 'countries'].includes(scopeType)
          ? "; they can propose new shows in those territories"
          : ""}
        {inviteAsBookingAgent ? "; the band is also inviting them as its booking agent" : ""}
        .
      </div>
      <button
        disabled={busy || !recipientName.trim() || !recipient.trim()}
        onClick={invite}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff5738] px-6 font-bold text-white disabled:opacity-50 sm:w-auto"
      >
        <UserPlus size={17} />
        {busy ? "Creating…" : "Create invitation"}
      </button>
      {inviteUrl && inviteEntityId === entityId && (
        <div className="mt-5 rounded-2xl border border-[#a9c46b] bg-[#f1f6df] p-4">
          <p className="font-bold text-[#30381b]">Invitation ready</p>
          <p className="mt-1 text-sm text-[#596044]">
            {inviteEmailDelivered
              ? `SceneGen emailed the private link to ${inviteRecipient}. You can also copy it below.`
              : `Email delivery failed. Send this private link to ${inviteRecipient}; they must sign in using that email address.`}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              readOnly
              value={inviteUrl}
              className="h-12 min-w-0 w-full rounded-xl border border-[#cad8a3] bg-white px-3 text-sm"
            />
            <button
              onClick={() => {
                void copyText(inviteUrl).then((copied) => copied ? toast.success("Link copied") : toast.error("Could not copy link"));
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#171713] px-4 py-3 font-bold text-white"
            >
              <Clipboard size={16} /> Copy
            </button>
          </div>
        </div>
      )}
      {agentRelationships.length > 0 && <div className="mt-8 border-t border-[#d8d0c3] pt-6">
        <div className="flex items-center gap-2"><Handshake size={18} className="text-[#e74428]"/><h3 className="font-black text-[#171713]">Booking-agent relationships</h3></div>
        <p className="mt-2 text-sm leading-6 text-[#6c675e]">Approving confirms that this person represents the artist. Their day-sheet permissions remain controlled separately below.</p>
        <div className="mt-3 divide-y divide-[#ddd4c7]">{agentRelationships.map((relationship) => <article key={relationship.id} className="py-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{relationship.display_name}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${relationship.status === 'active' ? 'bg-[#e4f0df] text-[#286338]' : relationship.status === 'requested' ? 'bg-[#fff0cf] text-[#80520d]' : 'bg-[#e5ddd1] text-[#625e55]'}`}>{relationship.status.replaceAll('_', ' ')}</span></div><p className="mt-1 text-sm text-[#6c675e]">{relationship.email}{relationship.agency_name ? ` · ${relationship.agency_name}` : ''}{relationship.commission_percentage == null ? '' : ` · ${relationship.commission_percentage}% default commission`}</p>{relationship.decision_note && <p className="mt-2 text-sm text-[#6c675e]">{relationship.decision_note}</p>}</div>
          <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
            {['requested', 'changes_requested'].includes(relationship.status) && <><button type="button" disabled={busy} onClick={() => void decideAgentRelationship(relationship.id, 'decline')} className="min-h-11 rounded-full border border-[#d7cfc2] px-4 text-sm font-bold disabled:opacity-50">Decline</button><button type="button" disabled={busy} onClick={() => void decideAgentRelationship(relationship.id, 'approve')} className="min-h-11 rounded-full bg-[#171713] px-5 text-sm font-bold text-white disabled:opacity-50"><Check size={16} className="mr-2 inline"/>Approve</button></>}
            <button type="button" disabled={busy} onClick={() => void removeAgentRelationship(relationship)} className="min-h-11 rounded-full border border-[#b42318] px-4 text-sm font-bold text-[#b42318] disabled:opacity-50">Remove booking agent</button>
          </div>
        </article>)}</div>
      </div>}
      <div className="mt-8 border-t border-[#d8d0c3] pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-black text-[#171713]">People with access</h3><span className="rounded-full bg-[#e5ddd1] px-2.5 py-1 text-xs font-black text-[#625e55]">{items.length}</span></div><p className="mt-1 text-sm text-[#777267]">Manage day-sheet roles and invitations.</p></div>{items.length > 3 && <div className="flex w-full gap-2 sm:w-auto"><label className="relative min-w-0 flex-1 sm:w-56"><span className="sr-only">Search people with access</span><Search className="pointer-events-none absolute left-3 top-3 text-[#777267]" size={17}/><input value={accessQuery} onChange={(event) => setAccessQuery(event.target.value)} placeholder="Search people…" className="h-11 w-full rounded-lg border border-[#d7cfc2] bg-white pl-9 pr-3 text-sm"/></label><label><span className="sr-only">Filter access status</span><select value={accessStatus} onChange={(event) => setAccessStatus(event.target.value as 'all' | 'active' | 'pending')} className="h-11 rounded-lg border border-[#d7cfc2] bg-white px-3 text-sm font-bold"><option value="all">All</option><option value="active">Active</option><option value="pending">Pending</option></select></label></div>}</div>
        {!items.length ? (
          <p className="mt-3 text-sm text-[#777267]">
            No external day-sheet access has been granted.
          </p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-xl border border-[#d8d0c3] bg-white">
            {visibleAccess.map((item) => {
              const key = `${item.kind}-${item.id}`;
              const expanded = expandedAccess === key;
              return <article key={key} className="border-b border-[#e4ddd2] last:border-b-0">
                <div className="grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(220px,1.1fr)_minmax(260px,1fr)_auto]">
                  <div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><p className="truncate font-black text-[#171713]">{item.name || 'Name not supplied'}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${item.kind === 'invite' ? 'bg-[#fff0cf] text-[#80520d]' : 'bg-[#e4f0df] text-[#286338]'}`}>{item.kind === 'invite' ? 'Pending' : 'Active'}</span></div><p className="mt-1 truncate text-xs text-[#6c675e]">{item.email}</p></div>
                  <div className="hidden min-w-0 flex-wrap gap-1.5 sm:flex"><span className="rounded-full bg-[#f2ebe0] px-2.5 py-1 text-[10px] font-bold">{accessRoleLabel(item)}</span><span className="max-w-48 truncate rounded-full bg-[#f2ebe0] px-2.5 py-1 text-[10px] font-bold" title={item.scope_label}>{item.scope_label}</span><span className="rounded-full bg-[#f2ebe0] px-2.5 py-1 text-[10px] font-bold">{accessPermissionLabel(item)}</span></div>
                  <div className="flex shrink-0 items-center gap-1">{item.kind === 'invite' && item.access_link && <button type="button" onClick={() => { void copyText(item.access_link || '').then((copied) => copied ? toast.success('Invite link copied') : toast.error('Could not copy invite link')); }} className="hidden min-h-10 items-center gap-2 rounded-full border border-[#d7cfc2] px-3 text-xs font-bold md:inline-flex"><Clipboard size={14}/>Copy invite</button>}<button type="button" onClick={() => setExpandedAccess(expanded ? null : key)} aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} access details for ${item.email}`} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#f2ebe0]"><ChevronDown size={18} className={`transition-transform ${expanded ? 'rotate-180' : ''}`}/></button></div>
                </div>
                {expanded && <div className="border-t border-[#e4ddd2] bg-[#fffaf2] px-4 py-4">
                  <div className="flex flex-wrap gap-2 sm:hidden"><span className="rounded-full bg-[#e5ddd1] px-2.5 py-1 text-xs font-bold">{accessRoleLabel(item)}</span><span className="rounded-full bg-[#e5ddd1] px-2.5 py-1 text-xs font-bold">{item.scope_label}</span><span className="rounded-full bg-[#e5ddd1] px-2.5 py-1 text-xs font-bold">{accessPermissionLabel(item)}</span></div>
                  <p className="mt-3 text-sm leading-6 text-[#6c675e] sm:mt-0">{['band_member', 'crew_member'].includes(item.access_role || '') ? 'Day sheets only. Flights and travel are visible; finances, promoter contacts, notes and documents are hidden.' : `${item.financial_access === 'edit' ? 'Can edit finances' : item.financial_access === 'view' ? 'Can view finances' : 'Finances hidden'}${item.require_approval ? ' · Sensitive edits require approval' : ''}${item.can_propose_shows ? ' · Can propose shows' : ''}`}</p>
                  <div className="mt-3 flex flex-wrap gap-2">{item.kind === 'invite' && <>{item.access_link && <button type="button" onClick={() => { void copyText(item.access_link || '').then((copied) => copied ? toast.success('Invite link copied') : toast.error('Could not copy invite link')); }} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#171713] px-4 text-sm font-bold text-white md:hidden"><Clipboard size={15}/>Copy invite</button>}<button type="button" disabled={busy} onClick={() => void refreshAccessLink(item)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d7cfc2] px-4 text-sm font-bold disabled:opacity-50"><RefreshCw size={15}/>Refresh link</button></>}<button disabled={busy} onClick={() => beginEdit(item)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d7cfc2] px-4 text-sm font-bold disabled:opacity-50"><Pencil size={15}/>Edit access</button><button disabled={busy} onClick={() => void revoke(item)} title="Revoke day-sheet access" aria-label={`Revoke day-sheet access for ${item.email}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d7cfc2] px-4 text-sm font-bold text-[#8a3426] disabled:opacity-50"><Trash2 size={15}/>Remove access</button></div>
                  {item.kind === 'invite' && !item.access_link && <p className="mt-3 text-xs text-[#6c675e]">This older invitation has no visible link. Refresh it to create a new one.</p>}
                </div>}
              </article>;
            })}
            {!visibleAccess.length && <p className="p-6 text-center text-sm text-[#777267]">No people match this search or filter.</p>}
          </div>
        )}
      </div>
      {editing && draft && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/45 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="permission-editor-title"
        >
          <div className="mobile-safe-top mobile-safe-bottom min-h-[100dvh] w-full overflow-y-auto bg-[#fffaf2] p-5 shadow-2xl sm:my-8 sm:min-h-0 sm:max-w-2xl sm:rounded-3xl sm:p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#ff5738]">
                  Edit permissions
                </p>
                <h3
                  id="permission-editor-title"
                  className="mt-1 text-2xl font-black"
                >
                  {draft.name || "Name not supplied"}
                </h3>
                <p className="mt-1 text-sm font-medium text-[#6c675e]">
                  {editing.email}
                </p>
              </div>
              <button
                disabled={busy}
                onClick={closeEditor}
                title="Close permission editor"
                aria-label="Close permission editor"
                className="rounded-full border border-[#d7cfc2] p-2 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <label className="mt-6 block">
              <span className="mb-2 block text-xs font-bold uppercase">
                Person’s name
              </span>
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                type="text"
                maxLength={120}
                className="h-12 w-full rounded-xl border bg-white px-4 text-base sm:text-sm"
              />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-bold uppercase">
                  Day-sheet access
                </span>
                <select
                  value={draft.editScope}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      editScope: event.target
                        .value as PermissionDraft["editScope"],
                    })
                  }
                  className="h-12 w-full rounded-xl border bg-white px-4"
                >
                  <option value="none">View only</option>
                  <option value="advance">Edit advance information</option>
                  <option value="full">Edit entire day sheet</option>
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold uppercase">
                  Financial access
                </span>
                <select
                  value={draft.financialAccess}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      financialAccess: event.target
                        .value as PermissionDraft["financialAccess"],
                    })
                  }
                  className="h-12 w-full rounded-xl border bg-white px-4"
                >
                  <option value="hidden">Financial details hidden</option>
                  <option value="view">Can view finances</option>
                  <option value="edit">Can view and edit finances</option>
                </select>
              </label>
            </div>
            {(draft.editScope !== "none" ||
              draft.financialAccess === "edit") && (
              <label className="mt-4 flex gap-3 rounded-2xl border bg-white p-4">
                <input
                  type="checkbox"
                  checked={draft.requireApproval}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      requireApproval: event.target.checked,
                    })
                  }
                  className="h-5 w-5 accent-[#ff5738]"
                />
                <strong>Require approval for sensitive changes</strong>
              </label>
            )}
            {['all', 'countries'].includes(draft.scopeType) && (
              <label className="mt-4 flex gap-3 rounded-2xl border bg-white p-4">
                <input
                  type="checkbox"
                  checked={draft.canProposeShows}
                  onChange={(event) => setDraft({ ...draft, canProposeShows: event.target.checked })}
                  className="h-5 w-5 accent-[#ff5738]"
                />
                <span>
                  <strong className="flex items-center gap-2"><Handshake size={17}/> Can propose new shows</strong>
                  <span className="mt-1 block text-sm font-normal text-[#686258]">Limited to the territories in this permission. Every proposal creates a pending day sheet for band approval.</span>
                </span>
              </label>
            )}
            <p className="mb-3 mt-5 text-xs font-bold uppercase">
              Which day sheets?
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["countries", "Countries"],
                  ["all", "All"],
                  ["tour", "One tour"],
                  ["show", "One day sheet"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setDraft({
                    ...draft,
                    scopeType: value,
                    canProposeShows: (value === 'all' || value === 'countries') ? draft.canProposeShows : false,
                  })}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold ${draft.scopeType === value ? "bg-[#171713] text-white" : "bg-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {draft.scopeType === "countries" && (
              <div className="mt-4 rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((region) => {
                    const value = `@region:${region}`;
                    const active = draft.countries.includes(value);
                    return (
                      <button
                        type="button"
                        key={region}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            countries: active
                              ? draft.countries.filter((item) => item !== value)
                              : [...draft.countries, value],
                          })
                        }
                        className={`rounded-full border px-3 py-2 text-sm font-bold ${active ? "border-[#ff5738] bg-[#fff0eb]" : ""}`}
                      >
                        {region}
                      </button>
                    );
                  })}
                </div>
                <CountryList
                  value=""
                  onChange={(country) => {
                    if (country && !draft.countries.includes(country))
                      setDraft({
                        ...draft,
                        countries: [...draft.countries, country],
                      });
                  }}
                  className="mt-3 h-12 w-full rounded-xl border bg-white px-4"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {draft.countries.map((country) => (
                    <button
                      type="button"
                      key={country}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          countries: draft.countries.filter(
                            (item) => item !== country,
                          ),
                        })
                      }
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#ff5738] bg-[#fff0eb] px-3 py-2 text-sm font-bold"
                    >
                      {territoryLabel(country)} <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5 shrink-0"><path d="m6 6 12 12M18 6 6 18" /></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {draft.scopeType === "tour" && (
              <select
                value={draft.tourId}
                onChange={(event) =>
                  setDraft({ ...draft, tourId: event.target.value })
                }
                className="mt-4 h-12 w-full rounded-xl border bg-white px-4"
              >
                <option value="">Choose a tour…</option>
                {tours.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.name}
                  </option>
                ))}
              </select>
            )}
            {draft.scopeType === "show" && (
              <div className="mt-4"><ShowChoicePicker shows={shows} value={draft.showId} onChange={(id) => setDraft({ ...draft, showId: id })}/></div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button
                disabled={busy}
                onClick={closeEditor}
                className="min-h-12 rounded-full border px-5 py-3 font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={() => void savePermissions()}
                className="min-h-12 rounded-full bg-[#ff5738] px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
