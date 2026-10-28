'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Eye, Handshake, List, LogOut, MapPin, Pencil, Plus, Send, ShieldOff, ShieldCheck, UserRound } from 'lucide-react';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SceneGenWordmark } from '@/components/brand/scene-gen-mark';
import { ShowProposalForm } from '@/components/proposals/show-proposal-form';
import { normaliseProposal, normaliseWorkspace, type ProposalWorkspace, type ShowProposal } from '@/types/show-proposal';
import { clearRevokedDaySheetData } from '@/lib/offline-road-pack';

type Show = {
  id: string;
  showDate?: string;
  venueName?: string;
  festivalName?: string;
  venueCity?: string;
  venueCountry?: string;
  workspaceName?: string;
  accessLevel?: 'viewer' | 'editor';
  financialAccess?: 'hidden' | 'view' | 'edit';
  accessRole?: 'collaborator' | 'band_member' | 'crew_member';
  tourId?: string;
  tourName?: string | null;
  guarantee?: number | string;
  currency?: string;
  entityId?: string;
};
type Profile = { name: string; email: string; needsProfileConfirmation: boolean };
type GrantScope = { scopeType: 'all' | 'countries' | 'tour' | 'show'; countries?: string[]; tourId?: string | null; showId?: string | null };
type DaySheetWorkspace = { id: string; name: string; accessLevels: string[]; accessRoles?: string[]; financialAccess: string[]; canProposeShows: boolean; activeGrantCount: number; grantScopes: GrantScope[] };
type AgentUpgradeRequest = { id: string; entity_id: string; entity_name: string; status: 'requested' | 'changes_requested' | 'approved' | 'active' | 'paused' | 'ended' | 'declined'; commission_percentage?: number | null; decision_note?: string | null };
type Tab = 'upcoming' | 'previous';
type View = 'list' | 'calendar';

const dateKey = (value?: string) => value?.slice(0, 10) || '';
const localTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const monthKeyFor = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const tourPalette = ['#e74428', '#397c6a', '#3d6f9e', '#b06b16', '#9a4f70', '#62722f'];
const colourFor = (show: Show) => {
  if (!show.tourId) return '#171713';
  let hash = 0;
  for (const character of show.tourId) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return tourPalette[Math.abs(hash) % tourPalette.length];
};
const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
const permissionLabel = (workspace: DaySheetWorkspace) => workspace.accessLevels.includes('editor') ? 'Can edit' : workspace.canProposeShows ? 'Can propose shows' : 'View only';
const territoryLabel = (workspace: DaySheetWorkspace) => {
  if (workspace.grantScopes.some((scope) => scope.scopeType === 'all')) return 'All assigned shows';
  const countries = [...new Set(workspace.grantScopes.flatMap((scope) => scope.scopeType === 'countries' ? scope.countries || [] : []))];
  if (countries.length) return countries.join(', ');
  const tours = workspace.grantScopes.filter((scope) => scope.scopeType === 'tour').length;
  const shows = workspace.grantScopes.filter((scope) => scope.scopeType === 'show').length;
  return [tours ? `${tours} ${tours === 1 ? 'tour' : 'tours'}` : '', shows ? `${shows} ${shows === 1 ? 'show' : 'shows'}` : ''].filter(Boolean).join(' · ') || 'Assigned access';
};

function ExternalDaySheetsContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [shows, setShows] = useState<Show[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [view, setView] = useState<View>('list');
  const [todayKey, setTodayKey] = useState('');
  const [monthKey, setMonthKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayLabel, setTodayLabel] = useState('');
  const [loadError, setLoadError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [proposals, setProposals] = useState<ShowProposal[]>([]);
  const [proposalWorkspaces, setProposalWorkspaces] = useState<ProposalWorkspace[]>([]);
  const [proposalError, setProposalError] = useState('');
  const [proposalFormOpen, setProposalFormOpen] = useState(false);
  const [proposalToRevise, setProposalToRevise] = useState<ShowProposal | null>(null);
  const [daySheetWorkspaces, setDaySheetWorkspaces] = useState<DaySheetWorkspace[]>([]);
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [agentRequests, setAgentRequests] = useState<AgentUpgradeRequest[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeBand, setUpgradeBand] = useState('');
  const [upgradeName, setUpgradeName] = useState('');
  const [upgradeAgency, setUpgradeAgency] = useState('');
  const [upgradeCommission, setUpgradeCommission] = useState('');
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [agentSwitchError, setAgentSwitchError] = useState('');
  const [switchingToAgent, setSwitchingToAgent] = useState(false);
  const [hasActiveAccess, setHasActiveAccess] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadPortal() {
      if (status === 'loading') return;
      if (status === 'unauthenticated') {
        window.location.replace('/login');
        return;
      }
      const expectedEmail = new URLSearchParams(window.location.search).get('expectedEmail')?.trim().toLowerCase();
      const signedInEmail = session?.user?.email?.trim().toLowerCase();
      if (expectedEmail && signedInEmail !== expectedEmail) {
        await signOut({ redirect: false });
        router.replace(`/collaborator-access?error=wrong-account&email=${encodeURIComponent(expectedEmail)}`);
        return;
      }
      if (expectedEmail) window.history.replaceState(null, '', '/external-day-sheets');
      const now = new Date();
      setTodayLabel(new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(now));
      setTodayKey(localTodayKey());
      setMonthKey(monthKeyFor(now));
      Promise.all([
        fetch('/api/collaborator/day-sheets', { cache: 'no-store' }),
        fetch('/api/collaborator/show-proposals', { cache: 'no-store' }),
        fetch('/api/collaborator/workspaces', { cache: 'no-store' }),
        fetch('/api/collaborator/booking-agent-upgrade', { cache: 'no-store' }),
      ]).then(async ([response, proposalResponse, workspaceResponse, upgradeResponse]) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error?.message || 'Unable to load day sheets');
          setShows(data.shows || []);
          setHasActiveAccess(Boolean(data.hasActiveAccess));
          if (!data.hasActiveAccess && session?.user?.id) await clearRevokedDaySheetData(session.user.id);
          setProfile(data.profile || null);
          setNameDraft(data.profile?.name || '');
          setEditingProfile(Boolean(data.profile?.needsProfileConfirmation && (data.shows || []).length));
          const proposalData = await proposalResponse.json();
          if (proposalResponse.ok) {
            setProposals((proposalData.proposals || []).map(normaliseProposal));
            setProposalWorkspaces((proposalData.workspaces || []).map(normaliseWorkspace));
          } else setProposalError(proposalData.error?.message || 'Unable to load show proposals');
          const workspaceData = await workspaceResponse.json();
          if (!workspaceResponse.ok) throw new Error(workspaceData.error?.message || 'Unable to load day-sheet workspaces');
          setDaySheetWorkspaces(workspaceData.workspaces || []);
          const upgradeData = await upgradeResponse.json();
          if (upgradeResponse.ok) setAgentRequests(upgradeData.requests || []);
        })
        .catch((caught) => setLoadError(caught instanceof Error ? caught.message : 'Unable to load day sheets'))
        .finally(() => setLoading(false));
    }
    void loadPortal();
  }, [router, session?.user?.email, status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let stopped = false;
    const revalidateAccess = async () => {
      const response = await fetch('/api/collaborator/day-sheets', { cache: 'no-store' }).catch(() => null);
      if (!response?.ok || stopped) return;
      const data = await response.json();
      if (stopped) return;
      setHasActiveAccess(Boolean(data.hasActiveAccess));
      setShows(data.shows || []);
      setDaySheetWorkspaces((current) => data.hasActiveAccess ? current : []);
      setProposals((current) => data.hasActiveAccess ? current : []);
      if (!data.hasActiveAccess && session?.user?.id) await clearRevokedDaySheetData(session.user.id);
    };
    const visible = () => { if (document.visibilityState === 'visible') void revalidateAccess(); };
    const timer = window.setInterval(() => void revalidateAccess(), 30_000);
    window.addEventListener('focus', revalidateAccess);
    document.addEventListener('visibilitychange', visible);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener('focus', revalidateAccess); document.removeEventListener('visibilitychange', visible); };
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let stopped = false;
    const refreshAgentStatus = async () => {
      const response = await fetch('/api/collaborator/booking-agent-upgrade', { cache: 'no-store' }).catch(() => null);
      if (!response?.ok || stopped) return;
      const data = await response.json();
      if (!stopped) setAgentRequests(data.requests || []);
    };
    const timer = window.setInterval(() => void refreshAgentStatus(), 5_000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [status]);

  const filteredShows = workspaceFilter === 'all' ? shows : shows.filter((show) => show.entityId === workspaceFilter);
  const upcoming = filteredShows
    .filter((show) => !dateKey(show.showDate) || !todayKey || dateKey(show.showDate) >= todayKey)
    .sort((left, right) => dateKey(left.showDate).localeCompare(dateKey(right.showDate)));
  const previous = filteredShows
    .filter((show) => dateKey(show.showDate) && dateKey(show.showDate) < todayKey)
    .sort((left, right) => dateKey(right.showDate).localeCompare(dateKey(left.showDate)));
  const visibleShows = tab === 'upcoming' ? upcoming : previous;
  const filteredProposals = workspaceFilter === 'all' ? proposals : proposals.filter((proposal) => proposal.entityId === workspaceFilter);
  const filteredProposalWorkspaces = workspaceFilter === 'all' ? proposalWorkspaces : proposalWorkspaces.filter((workspace) => workspace.id === workspaceFilter);
  const nextShow = upcoming.find((show) => dateKey(show.showDate)) || upcoming[0];
  const workspaceNames = daySheetWorkspaces.map((workspace) => workspace.name);
  const professionalWorkspaces = daySheetWorkspaces.filter((workspace) => !(workspace.accessRoles || []).some((role) => ['band_member', 'crew_member'].includes(role)));
  const bandMemberOnly = shows.length > 0 && shows.every((show) => ['band_member', 'crew_member'].includes(show.accessRole || ''));
  const nextShowDays = (() => {
    if (!todayKey || !nextShow?.showDate) return null;
    const today = new Date(`${todayKey}T12:00:00`);
    const showDate = new Date(`${dateKey(nextShow.showDate)}T12:00:00`);
    return Math.round((showDate.getTime() - today.getTime()) / 86_400_000);
  })();
  const [monthYear = '', monthNumber = ''] = monthKey.split('-');
  const calendarYear = Number(monthYear);
  const calendarMonth = Number(monthNumber);
  const daysInMonth = monthKey ? new Date(Date.UTC(calendarYear, calendarMonth, 0)).getUTCDate() : 0;
  const firstWeekday = monthKey ? new Date(Date.UTC(calendarYear, calendarMonth - 1, 1)).getUTCDay() : 0;
  const monthCells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthShows = visibleShows.filter((show) => dateKey(show.showDate).startsWith(monthKey));
  const monthLabel = monthKey ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(calendarYear, calendarMonth - 1, 1))) : '';

  function shiftMonth(offset: number) {
    if (!monthKey) return;
    setMonthKey(monthKeyFor(new Date(calendarYear, calendarMonth - 1 + offset, 1)));
  }

  function showFirstMonth(candidateShows: Show[]) {
    const firstDate = candidateShows.map((show) => dateKey(show.showDate)).find(Boolean);
    if (firstDate) setMonthKey(firstDate.slice(0, 7));
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    if (view === 'calendar') showFirstMonth(nextTab === 'upcoming' ? upcoming : previous);
  }

  function openCalendar() {
    showFirstMonth(visibleShows);
    setView('calendar');
  }

  function openProfileEditor() {
    setProfileError('');
    setEditingProfile(true);
  }

  async function saveProfile() {
    setSaving(true);
    setProfileError('');
    try {
      const response = await fetch('/api/collaborator/day-sheets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to save your profile');
      setProfile(data.profile);
      setEditingProfile(false);
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : 'Unable to save your profile');
    } finally {
      setSaving(false);
    }
  }

  function openAgentUpgrade() {
    const eligible = daySheetWorkspaces.find((workspace) => !agentRequests.some((request) => request.entity_id === workspace.id && ['requested', 'changes_requested', 'approved', 'active', 'paused'].includes(request.status)));
    setUpgradeBand(eligible?.id || daySheetWorkspaces[0]?.id || '');
    setUpgradeName(profile?.name || session?.user?.name || '');
    setUpgradeAgency('');
    setUpgradeCommission('');
    setUpgradeError('');
    setUpgradeOpen(true);
  }

  async function enterBookingAgentView(relationshipId: string) {
    setSwitchingToAgent(true); setAgentSwitchError('');
    try {
      const activationResponse = await fetch('/api/collaborator/booking-agent-activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relationshipId }) });
      const activation = await activationResponse.json();
      if (!activationResponse.ok || !activation.token) throw new Error(activation.error?.message || 'Unable to activate the booking-agent view');
      const csrfResponse = await fetch('/api/auth/csrf', { cache: 'no-store' });
      const { csrfToken } = await csrfResponse.json();
      if (!csrfResponse.ok || !csrfToken) throw new Error('Unable to prepare the booking-agent session');
      const authResponse = await fetch('/api/auth/callback/booking-agent-activation', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' }, body: new URLSearchParams({ token: activation.token, csrfToken, callbackUrl: `${window.location.origin}/agent` }) });
      const authResult = await authResponse.json().catch(() => ({}));
      if (!authResponse.ok || !authResult.url || new URL(authResult.url, window.location.origin).searchParams.has('error')) throw new Error('The booking-agent session could not be opened');
      let sessionReady = false;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const sessionResponse = await fetch('/api/auth/session', { cache: 'no-store' });
        if (sessionResponse.ok && (await sessionResponse.json())?.user?.id) { sessionReady = true; break; }
        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }
      if (!sessionReady) throw new Error('The booking-agent session could not be confirmed');
      await fetch('/api/booking-agent/activation-confirmation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relationshipId }) }).catch(() => null);
      const collaboratorCsrf = await fetch('/api/collaborator-auth/csrf', { cache: 'no-store' }).then((response) => response.json()).catch(() => ({}));
      if (collaboratorCsrf.csrfToken) await fetch('/api/collaborator-auth/signout', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' }, body: new URLSearchParams({ csrfToken: collaboratorCsrf.csrfToken, callbackUrl: `${window.location.origin}/agent` }) }).catch(() => null);
      router.replace('/agent');
    } catch (caught) { setAgentSwitchError(caught instanceof Error ? caught.message : 'Unable to open the booking-agent view'); setSwitchingToAgent(false); }
  }

  async function requestAgentUpgrade() {
    setUpgradeBusy(true);
    setUpgradeError('');
    try {
      const response = await fetch('/api/collaborator/booking-agent-upgrade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityId: upgradeBand, displayName: upgradeName, agencyName: upgradeAgency, commissionPercentage: upgradeCommission }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to send the request');
      setAgentRequests((current) => [data.request, ...current]);
      setUpgradeOpen(false);
    } catch (caught) { setUpgradeError(caught instanceof Error ? caught.message : 'Unable to send the request'); }
    finally { setUpgradeBusy(false); }
  }

  if (!loading && hasActiveAccess === false) return <main className="mobile-safe-top mobile-safe-bottom grid min-h-[100dvh] place-items-center bg-[#f3ede3] p-5 text-[#171713]">
    <section className="w-full max-w-md rounded-3xl border border-[#d8d0c3] bg-[#fffaf2] p-7 text-center shadow-[0_20px_65px_rgba(20,20,16,.10)] sm:p-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f2e9de] text-[#e74428]"><ShieldOff size={27}/></span>
      <p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-[#e74428]">Access removed</p>
      <h1 className="mt-3 text-3xl font-black tracking-[-.04em]">No day-sheet access</h1>
      <p className="mt-4 text-sm leading-6 text-[#686258]">You do not currently have access to any SceneGen day sheets. Ask the band administrator for a new invitation if you believe this is a mistake.</p>
      <p className="mt-4 rounded-xl bg-[#f2ebe0] p-4 text-xs leading-5 text-[#686258]">Previously saved day-sheet copies on this device have been removed.</p>
      <button type="button" onClick={() => void signOut({ callbackUrl: '/' })} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#171713] px-5 font-black text-white"><LogOut size={17}/>Sign out</button>
    </section>
  </main>;

  if (!loading && bandMemberOnly) return <main className="min-h-[100dvh] bg-[#f3ede3] pb-12">
    <nav className="mobile-safe-top border-b border-white/10 bg-[#11130f] text-white"><div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between px-4 sm:px-6"><SceneGenWordmark/><button type="button" onClick={() => void signOut({ callbackUrl: '/' })} className="flex min-h-11 items-center gap-2 rounded-md border border-white/15 px-4 text-sm font-bold"><LogOut size={16}/>Sign out</button></div></nav>
    <header className="border-b border-[#d8d0c3] bg-[#fffaf2] px-4 py-8"><div className="mx-auto max-w-6xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#e74428]">Band member · Day sheets only</p><h1 className="mt-2 text-4xl font-black">Your assigned day sheets</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#686258]">Read-only show schedules with existing flight, travel and accommodation details. Commercial information, promoter contacts, private notes and documents remain private to the band&apos;s management.</p></div></header>
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><div className="grid gap-4 md:grid-cols-2">{shows.sort((left, right) => dateKey(left.showDate).localeCompare(dateKey(right.showDate))).map((show) => <Link key={show.id} href={`/external-day-sheets/${show.id}`} className="rounded-xl border border-[#d8d0c3] border-l-4 border-l-[#e74428] bg-[#fffaf2] p-5 shadow-sm"><p className="text-xs font-black uppercase text-[#e74428]">{show.workspaceName}</p><h2 className="mt-2 text-xl font-black">{show.festivalName || show.venueName || show.venueCity || 'Day sheet'}</h2><p className="mt-3 flex items-center gap-2 text-sm"><CalendarDays size={16}/>{show.showDate ? new Date(`${dateKey(show.showDate)}T12:00:00`).toLocaleDateString() : 'Date TBC'}</p><p className="mt-2 flex items-center gap-2 text-sm"><MapPin size={16}/>{[show.venueCity, show.venueCountry].filter(Boolean).join(', ') || 'Location TBC'}</p><p className="mt-5 flex items-center justify-between border-t border-[#e2dbd0] pt-4 text-sm font-black">Open day sheet <ArrowRight size={17}/></p></Link>)}</div>{!shows.length && <p className="rounded-xl bg-[#fffaf2] p-6">No active day sheets have been assigned to you.</p>}</section>
  </main>;

  return (
    <main className="min-h-[100dvh] bg-[#f3ede3] pb-[env(safe-area-inset-bottom)] text-[#171713]">
      <nav className="mobile-safe-top sticky top-0 z-40 border-b border-white/10 bg-[#11130f]/95 text-white backdrop-blur" aria-label="External portal">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:min-h-[76px] sm:px-5 md:px-10">
          <div className="flex items-center gap-5">
            <SceneGenWordmark />
            <span className="hidden h-8 w-px bg-white/15 sm:block" aria-hidden="true" />
            <div className="hidden sm:block"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ff8068]">Day-sheet portal</p><p className="mt-1 text-xs text-white/55">External collaborator workspace</p></div>
          </div>
          <div className="flex items-center gap-2">
            {profile && <button type="button" onClick={openProfileEditor} className="hidden rounded-md border border-white/15 px-4 py-2 text-xs font-bold transition hover:bg-white/10 md:block">Edit profile</button>}
            <button type="button" onClick={() => void signOut({ callbackUrl: '/' })} className="flex min-h-11 items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs font-bold transition hover:bg-white/10" title="Sign out"><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </nav>
      <header className="border-b border-[#d8d0c3] bg-[#fffaf2] px-4 py-5 sm:px-5 sm:py-6 md:px-10 md:py-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 md:flex-row md:items-start md:gap-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#e74428]" />
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#e74428]">{bandMemberOnly ? 'Band member · Day sheets only' : 'External collaborator'}</p>
              <h1 className="text-2xl font-black sm:text-3xl md:text-4xl">My day sheets</h1>
            </div>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl bg-[#f3ede3] p-3 text-sm md:min-w-64 md:rounded-none md:border-l-2 md:border-[#e74428] md:bg-transparent md:p-0 md:pl-4">
            <div><p className="flex items-center gap-2 font-black"><UserRound size={17} />{profile?.name || session?.user?.name || 'Collaborator'}</p>
              <p className="mt-1 text-[#686258]">{profile?.email || session?.user?.email || (status === 'loading' ? 'Checking collaborator...' : 'Not signed in')}</p>
              <p className="mt-1 min-h-5 font-semibold">{todayLabel}</p></div>
            {profile && <button type="button" onClick={openProfileEditor} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[#e5ddd1]" aria-label="Edit profile" title="Edit profile"><Pencil size={18} /></button>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-5 sm:py-6 md:px-10 md:py-8">
        {agentRequests.filter((request) => ['approved', 'active'].includes(request.status)).map((request) => <section key={`approved-${request.id}`} className="mb-6 overflow-hidden rounded-xl border border-[#9dbd59] bg-[#f1f6df] shadow-sm" role="status"><div className="p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-[#617d00]"/><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#617d00]">Request accepted</p><h2 className="mt-1 text-xl font-black">{request.entity_name} approved your booking-agent request</h2><p className="mt-2 text-sm leading-6 text-[#596044]">Your day-sheet grants will continue to control the shows, territories and financial information you can access.</p></div></div><button type="button" disabled={switchingToAgent} onClick={() => void enterBookingAgentView(request.id)} className="mt-5 flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-[#171713] px-5 text-sm font-black text-white disabled:opacity-50 sm:mt-0 sm:w-auto">{switchingToAgent ? 'Opening…' : 'Enter booking-agent view'} <ArrowRight size={17}/></button></div>{agentSwitchError && <p className="border-t border-[#c7d99f] px-5 py-3 text-sm font-bold text-[#8f2d1d] sm:px-6">{agentSwitchError}</p>}</section>)}
        {!loading && daySheetWorkspaces.length > 0 && <section className="mb-6 rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-[#e74428]"><Handshake size={15}/> Professional role</p><h2 className="mt-2 text-xl font-black">Booking-agent access</h2><p className="mt-1 text-sm leading-6 text-[#686258]">Day-sheet access is separate from representing an artist. Request approval to add a band to your booking-agent roster.</p>
            {agentRequests.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{agentRequests.map((request) => <span key={request.id} className="rounded-full bg-[#e5ddd1] px-3 py-1.5 text-xs font-bold">{request.entity_name}: {request.status.replaceAll('_', ' ')}</span>)}</div>}
          </div>
          {daySheetWorkspaces.some((workspace) => !agentRequests.some((request) => request.entity_id === workspace.id && ['requested', 'changes_requested', 'approved', 'active', 'paused'].includes(request.status))) && <button type="button" onClick={openAgentUpgrade} className="mt-4 min-h-12 w-full shrink-0 rounded-md bg-[#171713] px-5 text-sm font-black text-white sm:mt-0 sm:w-auto">Request upgrade</button>}
        </section>}
        {!loading && filteredProposalWorkspaces.length > 0 && <section className="mb-6 rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-[#e74428]"><Handshake size={15}/> Booking access</p><h2 className="mt-2 text-xl font-black">Have an offer for the band?</h2><p className="mt-1 text-sm leading-6 text-[#686258]">Propose a venue, date and commercial terms. The band must approve it before a show is created.</p></div>
          <button type="button" onClick={() => setProposalFormOpen(true)} className="mt-4 flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-[#e74428] px-5 text-sm font-black text-white sm:mt-0 sm:w-auto"><Plus size={17}/> Propose a show</button>
        </section>}
        {!loading && daySheetWorkspaces.length > 0 && <section className="mb-6">
          <div className="rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e74428]">Day-sheet workspaces</p><p className="mt-1 text-sm text-[#686258]">Switch between bands that have granted you day-sheet access.</p></div>
            <label className="mt-4 block sm:mt-0"><span className="sr-only">Filter by day-sheet workspace</span><select value={workspaceFilter} onChange={(event) => setWorkspaceFilter(event.target.value)} className="min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 font-bold sm:min-w-64"><option value="all">All day-sheet workspaces</option>{daySheetWorkspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label>
          </div>
          <div className={`mt-3 grid gap-3 ${workspaceFilter === 'all' ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-1'}`}>
            {daySheetWorkspaces.filter((workspace) => workspaceFilter === 'all' || workspace.id === workspaceFilter).map((workspace) => {
              const permission = permissionLabel(workspace);
              return <article key={workspace.id} className="rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black">{workspace.name}</h2><p className="mt-1 text-sm text-[#686258]">{territoryLabel(workspace)}</p></div><span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${permission === 'Can edit' ? 'bg-[#e4f0df] text-[#286338]' : permission === 'Can propose shows' ? 'bg-[#fff0cf] text-[#80520d]' : 'bg-[#e5eaf2] text-[#40556f]'}`}>{permission === 'Can edit' ? <Pencil size={13}/> : permission === 'Can propose shows' ? <Send size={13}/> : <Eye size={13}/>} {permission}</span></div>
                <p className="mt-5 border-t border-[#e2dbd0] pt-4 text-xs leading-5 text-[#686258]">This is day-sheet access only. Booking-agent status is granted separately by the band.</p>
              </article>;
            })}
          </div>
        </section>}
        {!loading && nextShow && <section className="overflow-hidden rounded-2xl bg-[#171713] text-white shadow-[0_18px_50px_rgba(45,37,24,.13)] md:rounded-none">
          <div className="grid md:grid-cols-[1.35fr_.65fr]">
            <div className="border-l-4 border-[#e74428] p-5 sm:p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3"><p className="text-xs font-black uppercase tracking-[.2em] text-[#ff8068]">Next show</p>{nextShowDays != null && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{nextShowDays === 0 ? 'Today' : nextShowDays === 1 ? 'Tomorrow' : `In ${nextShowDays} days`}</span>}</div>
              <h2 className="mt-4 text-2xl font-black sm:text-3xl">{nextShow.festivalName || nextShow.venueName || nextShow.venueCity || 'Venue TBC'}</h2>
              <p className="mt-2 text-sm text-white/65">{nextShow.tourName || 'One-off show'}{nextShow.workspaceName ? ` · ${nextShow.workspaceName}` : ''}</p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm"><span className="flex items-center gap-2"><CalendarDays size={17} className="text-[#ff8068]" />{nextShow.showDate ? new Date(`${dateKey(nextShow.showDate)}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBC'}</span><span className="flex items-center gap-2"><MapPin size={17} className="text-[#ff8068]" />{[nextShow.venueCity, nextShow.venueCountry].filter(Boolean).join(', ') || 'Location TBC'}</span></div>
            </div>
            <div className="flex flex-col justify-between border-t border-white/10 bg-white/[.035] p-6 md:border-l md:border-t-0 md:p-8">
              <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/45">Portal access</p><p className="mt-2 text-sm font-bold">{workspaceNames.length === 1 ? workspaceNames[0] : `${workspaceNames.length} SceneGen workspaces`}</p><p className="mt-2 text-xs leading-5 text-white/50">{upcoming.length} upcoming · {previous.length} previous</p></div>
              <Link href={`/external-day-sheets/${nextShow.id}`} className="mt-6 flex min-h-12 items-center justify-between rounded-md bg-[#e74428] px-5 py-3 text-sm font-black transition hover:bg-[#c93a22]">Open next day sheet <ArrowRight size={17} /></Link>
            </div>
          </div>
        </section>}

        <section className={`${!loading && nextShow ? 'mt-6' : ''} grid gap-3 md:grid-cols-[1fr_auto]`}>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#d8d0c3] bg-[#e5ddd1] p-1" role="tablist" aria-label="Day sheet dates">
          {([['upcoming', 'Upcoming shows', upcoming.length], ['previous', 'Previous shows', previous.length]] as const).map(([value, label, count]) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => selectTab(value)} className={`min-h-12 rounded-md px-2 py-2 text-xs font-black transition sm:px-3 sm:text-sm ${tab === value ? 'bg-[#171713] text-white' : 'text-[#625e55] hover:bg-[#fffaf2]'}`}>
              {label} <span className="opacity-70">({count})</span>
            </button>
          ))}
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#d8d0c3] bg-[#e5ddd1] p-1" aria-label="View options">
            <button type="button" onClick={() => setView('list')} className={`flex min-h-12 items-center justify-center rounded-md p-3 ${view === 'list' ? 'bg-[#171713] text-white' : 'hover:bg-[#fffaf2]'}`} aria-label="List view" title="List view"><List size={18} /></button>
            <button type="button" onClick={openCalendar} className={`flex min-h-12 items-center justify-center rounded-md p-3 ${view === 'calendar' ? 'bg-[#171713] text-white' : 'hover:bg-[#fffaf2]'}`} aria-label="Calendar view" title="Calendar view"><CalendarDays size={18} /></button>
          </div>
        </section>


        {(filteredProposals.length > 0 || proposalError) && <section className="mt-6">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e74428]">Offers</p><h2 className="mt-1 text-2xl font-black">My proposals</h2></div>{proposalWorkspaces.length > 0 && <button type="button" onClick={() => setProposalFormOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-md border border-[#171713] px-4 text-sm font-black sm:flex"><Plus size={16}/> New proposal</button>}</div>
          {proposalError && <p className="mt-4 rounded-md border border-[#f3a18f] bg-[#fff0eb] p-4 text-sm font-bold text-[#a82f1d]">{proposalError}</p>}
          {filteredProposals.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-2">{filteredProposals.slice(0, 6).map((proposal) => <article key={proposal.id} className="rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-[#e74428]">{proposal.workspaceName || 'Show proposal'}</p><h3 className="mt-2 text-lg font-black">{proposal.venueName}</h3></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${proposal.status === 'accepted' ? 'bg-[#e6efd3] text-[#536b14]' : proposal.status === 'declined' ? 'bg-[#f5dfd9] text-[#9d311e]' : proposal.status === 'changes_requested' ? 'bg-[#fff0bf] text-[#775b00]' : 'bg-[#e5ddd1] text-[#625e55]'}`}>{proposal.status.replaceAll('_', ' ')}</span></div>
            <p className="mt-3 text-sm text-[#686258]">{new Date(`${proposal.showDate.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {[proposal.city, proposal.country].filter(Boolean).join(', ')}</p>
            <p className="mt-2 font-black">{money(proposal.offerAmount, proposal.currency)}</p>
            {proposal.decisionNote && <p className="mt-3 border-l-2 border-[#e74428] pl-3 text-sm leading-5 text-[#625e55]">{proposal.decisionNote}</p>}
            {proposal.events && proposal.events.length > 0 && <div className="mt-4 border-t border-[#e2dbd0] pt-3"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#80786e]">Activity</p>{proposal.events.slice(-3).reverse().map((event) => <p key={event.id} className="mt-2 text-xs text-[#686258]"><strong className="capitalize text-[#171713]">{event.eventType.replaceAll('_', ' ')}</strong> · {new Date(event.createdAt).toLocaleString()}{event.note ? ` — ${event.note}` : ''}</p>)}</div>}
            {proposal.status === 'changes_requested' && <button type="button" onClick={() => { setProposalToRevise(proposal); setProposalFormOpen(true); }} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#171713] px-4 text-sm font-black text-white"><Pencil size={15}/> Revise and resubmit</button>}
          </article>)}</div>}
        </section>}

        {loading ? <p className="mt-6 border-l-2 border-[#e74428] bg-[#fffaf2] p-5">Loading day sheets...</p>
          : loadError ? <p className="mt-6 rounded-lg border border-[#ff9d8c] bg-[#fff1ec] p-5 font-semibold">{loadError}</p>
            : view === 'list' ? (!visibleShows.length ? <p className="mt-6 border-l-2 border-[#b9afa0] bg-[#fffaf2] p-5">{filteredShows.length ? `No ${tab} day sheets were found.` : shows.length ? 'No day sheets match the selected band.' : 'No active day-sheet access is attached to this email address. If your invitation is still pending, accept it first; if access expired or was removed, ask the SceneGen workspace administrator.'}</p>
              : <div className="mt-6 grid gap-4 md:grid-cols-2">{visibleShows.map((show) => (
                <Link key={show.id} href={`/external-day-sheets/${show.id}`} className="min-h-40 rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-lg" style={{ borderLeft: `5px solid ${colourFor(show)}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-bold uppercase text-[#e74428]">{show.workspaceName}</p><p className="mt-1 text-xs font-semibold text-[#686258]">{show.tourName || 'One-off show'}</p></div>
                    <span className="text-xs font-bold text-[#625e55]">{show.accessLevel === 'editor' ? 'Can edit' : 'View only'}</span>
                  </div>
                  <h2 className="mt-2 text-xl font-black">{show.festivalName || show.venueName || show.venueCity || 'Day sheet'}</h2>
                  <p className="mt-3 flex items-center gap-2 text-sm"><CalendarDays size={16} />{show.showDate ? new Date(`${dateKey(show.showDate)}T12:00:00`).toLocaleDateString() : 'Date TBC'}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm"><MapPin size={16} />{[show.venueCity, show.venueCountry].filter(Boolean).join(', ') || 'Location TBC'}</p>
                </Link>
              ))}</div>)
              : <section className="mt-6">
                <div className="flex items-center justify-between border-b border-[#d8d0c3] bg-[#fffaf2] p-3 sm:p-4">
                  <button type="button" onClick={() => shiftMonth(-1)} className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-[#e5ddd1]" aria-label="Previous month" title="Previous month"><ChevronLeft /></button>
                  <h2 className="text-xl font-black">{monthLabel}</h2>
                  <button type="button" onClick={() => shiftMonth(1)} className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-[#e5ddd1]" aria-label="Next month" title="Next month"><ChevronRight /></button>
                </div>
                <div className="bg-[#fffaf2] md:hidden">{monthShows.length ? <div className="divide-y divide-[#e4ddd2]">{monthShows.map((show) => <Link key={show.id} href={`/external-day-sheets/${show.id}`} className="flex min-h-20 items-center gap-4 p-4"><span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white" style={{ backgroundColor: colourFor(show) }}><strong className="text-lg leading-none">{Number(dateKey(show.showDate).slice(8, 10))}</strong><small className="mt-1 text-[9px] font-black uppercase">{new Date(`${dateKey(show.showDate)}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</small></span><span className="min-w-0 flex-1"><strong className="block truncate">{show.venueName || show.venueCity || 'Show'}</strong><small className="mt-1 block truncate text-[#686258]">{show.tourName || 'One-off show'} · {[show.venueCity, show.venueCountry].filter(Boolean).join(', ')}</small></span><ChevronRight className="shrink-0 text-[#777168]" size={18} /></Link>)}</div> : <p className="p-8 text-center text-sm text-[#686258]">No assigned shows in this month.</p>}</div>
                <div className="hidden overflow-x-auto bg-[#fffaf2] md:block"><div className="min-w-[700px]">
                  <div className="grid grid-cols-7 text-center text-xs font-black uppercase text-[#686258]">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="py-2">{day}</div>)}</div>
                  <div className="grid grid-cols-7">{monthCells.map((day, index) => <div key={`${day || 'blank'}-${index}`} className="min-h-24 border border-[#e4ddd2] p-1"><span className="text-xs font-bold">{day}</span>{day && monthShows.filter((show) => Number(dateKey(show.showDate).slice(8, 10)) === day).map((show) => <Link key={show.id} href={`/external-day-sheets/${show.id}`} title={`${show.venueName || show.venueCity || 'Show'} · ${show.tourName || 'One-off show'}`} className="mt-1 block truncate rounded px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: colourFor(show) }}>{show.venueName || show.venueCity || 'Show'}</Link>)}</div>)}</div>
                </div></div>
                <div className="flex flex-wrap gap-3 border-t border-[#d8d0c3] bg-[#fffaf2] p-4 text-xs font-bold">{Array.from(new Map(monthShows.map((show) => [show.tourId || 'one-off', show])).values()).map((show) => <span key={show.tourId || 'one-off'} className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: colourFor(show) }} />{show.tourName || 'One-off shows'}</span>)}</div>
              </section>}
      </div>

      {editingProfile && profile && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 p-0 sm:flex sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-name-title">
          <form className="mobile-safe-top mobile-safe-bottom flex min-h-[100dvh] w-full flex-col justify-center bg-[#fffaf2] p-5 shadow-2xl sm:min-h-0 sm:max-w-md sm:rounded-lg sm:p-7" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#e74428]">Collaborator profile</p>
            <h2 id="confirm-name-title" className="mt-2 text-3xl font-black">{profile.needsProfileConfirmation ? 'Complete your profile' : 'Edit your profile'}</h2>
            <p className="mt-3 text-sm text-[#686258]">This name is shown to the bands that have granted you day-sheet access.</p>
            <label htmlFor="collaborator-name" className="mt-6 block text-xs font-black uppercase tracking-[.12em]">Name</label>
            <input id="collaborator-name" autoFocus required value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={120} className="mt-2 h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 text-base outline-none focus:border-[#e74428]" />
            <p className="mt-3 text-sm text-[#686258]">{profile.email}</p>
            {profileError && <p className="mt-3 text-sm font-semibold text-[#b52c17]">{profileError}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3">{!profile.needsProfileConfirmation && <button type="button" onClick={() => setEditingProfile(false)} className="min-h-12 rounded-md border border-[#d8d0c3] px-4 py-3 font-black">Cancel</button>}<button type="submit" disabled={saving || !nameDraft.trim()} className={`min-h-12 rounded-md bg-[#e74428] px-4 py-3 font-black text-white disabled:opacity-50 ${profile.needsProfileConfirmation ? 'col-span-2' : ''}`}>{saving ? 'Saving...' : 'Save profile'}</button></div>
          </form>
        </div>
      )}
      {upgradeOpen && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 p-0 sm:flex sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="agent-upgrade-title">
        <form className="mobile-safe-top mobile-safe-bottom flex min-h-[100dvh] w-full flex-col justify-center bg-[#fffaf2] p-5 shadow-2xl sm:min-h-0 sm:max-w-lg sm:rounded-xl sm:p-7" onSubmit={(event) => { event.preventDefault(); void requestAgentUpgrade(); }}>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#e74428]">Booking-agent profile</p><h2 id="agent-upgrade-title" className="mt-2 text-3xl font-black">Request artist approval</h2><p className="mt-3 text-sm leading-6 text-[#686258]">The artist will receive an in-app request. Your current day-sheet permissions will not change.</p>
          <label className="mt-5 text-xs font-black uppercase tracking-[.12em]">Artist</label><select required value={upgradeBand} onChange={(event) => setUpgradeBand(event.target.value)} className="mt-2 min-h-12 rounded-md border border-[#d8d0c3] bg-white px-4">{daySheetWorkspaces.filter((workspace) => !agentRequests.some((request) => request.entity_id === workspace.id && ['requested', 'changes_requested', 'approved', 'active', 'paused'].includes(request.status))).map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select>
          <label className="mt-4 text-xs font-black uppercase tracking-[.12em]">Professional name</label><input required minLength={2} maxLength={120} value={upgradeName} onChange={(event) => setUpgradeName(event.target.value)} className="mt-2 min-h-12 rounded-md border border-[#d8d0c3] bg-white px-4" />
          <label className="mt-4 text-xs font-black uppercase tracking-[.12em]">Agency name <span className="normal-case text-[#80786e]">(optional)</span></label><input maxLength={200} value={upgradeAgency} onChange={(event) => setUpgradeAgency(event.target.value)} className="mt-2 min-h-12 rounded-md border border-[#d8d0c3] bg-white px-4" />
          <label className="mt-4 text-xs font-black uppercase tracking-[.12em]">Default commission <span className="normal-case text-[#80786e]">(optional)</span></label><div className="relative mt-2"><input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={upgradeCommission} onChange={(event) => setUpgradeCommission(event.target.value)} className="min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 pr-10"/><span className="absolute right-4 top-3 font-bold">%</span></div>
          {upgradeError && <p className="mt-4 text-sm font-bold text-[#b52c17]">{upgradeError}</p>}
          <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setUpgradeOpen(false)} className="min-h-12 rounded-md border border-[#d8d0c3] font-black">Cancel</button><button type="submit" disabled={upgradeBusy || !upgradeBand || upgradeName.trim().length < 2} className="min-h-12 rounded-md bg-[#e74428] font-black text-white disabled:opacity-50">{upgradeBusy ? 'Sending…' : 'Send request'}</button></div>
        </form>
      </div>}
      {proposalFormOpen && <ShowProposalForm workspaces={filteredProposalWorkspaces} initialProposal={proposalToRevise} onClose={() => { setProposalFormOpen(false); setProposalToRevise(null); }} onSaved={(proposal) => { const workspace = proposalWorkspaces.find((item) => item.id === proposal.entityId); setProposals((current) => proposalToRevise ? current.map((item) => item.id === proposal.id ? { ...proposal, workspaceName: item.workspaceName || workspace?.name } : item) : [{ ...proposal, workspaceName: workspace?.name }, ...current]); setProposalFormOpen(false); setProposalToRevise(null); }} />}
    </main>
  );
}

export default function ExternalDaySheetsPage() {
  return <SessionProvider basePath="/api/collaborator-auth"><ExternalDaySheetsContent /></SessionProvider>;
}
