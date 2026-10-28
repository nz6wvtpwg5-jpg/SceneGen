"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Copy, Handshake, LogOut, MapPin, Pencil, Plus, Route, ShieldCheck, UserRound, X } from "lucide-react";
import { SceneGenWordmark } from "@/components/brand/scene-gen-mark";
import ContactLocationPicker, { type ContactLocation } from "@/components/contacts/ContactLocationPicker";
import { useProfileStore } from "@/store/useProfileStore";
import { ShowProposalForm } from "@/components/proposals/show-proposal-form";
import type { ProposalWorkspace, ShowProposal } from "@/types/show-proposal";
import { normaliseProposal, normaliseWorkspace } from "@/types/show-proposal";
import { copyText } from "@/lib/clipboard";

type AgentProfile = { displayName: string; agencyName?: string; bio?: string; city?: string; region?: string; country?: string; latitude?: number | null; longitude?: number | null };
type Workspace = {
  id: string;
  name: string;
  commissionPercentage: number | null;
  accessLevels: string[];
  canProposeShows: boolean;
  activeGrantCount: number;
  editScopes: string[];
  financialAccess: string[];
  grantScopes: Array<{ scopeType: string; countries?: string[]; tourId?: string; showId?: string }>;
};
type Show = {
  id: string;
  entityId?: string;
  workspaceName?: string;
  venueName?: string;
  venueCity?: string;
  venueCountry?: string;
  showDate?: string;
  accessLevel?: string;
  financialAccess?: string;
  guarantee?: number | string;
  currency?: string;
  commissionPercentage?: number | null;
  tourName?: string | null;
  status?: string;
  promoterName?: string;
};
type BandInvitation = {
  id: string;
  bandName: string;
  recipientEmail: string;
  recipientName?: string;
  status: string;
  expiresAt: string;
  entityId?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
};
type BandForm = {
  bandName: string;
  recipientName: string;
  recipientEmail: string;
  bio: string;
} & ContactLocation;

const emptyLocation = (): ContactLocation => ({
  city: "",
  region: "",
  country: "",
  latitude: null,
  longitude: null,
});
const emptyBandForm = (): BandForm => ({
  bandName: "",
  recipientName: "",
  recipientEmail: "",
  bio: "",
  ...emptyLocation(),
});
const dateKey = (value?: string) => value?.slice(0, 10) || "";
const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
const statusLabel = (status: string) => status.replaceAll("_", " ");
const displayDate = (value?: string) => {
  if (!value) return { day: "—", month: "Open", full: "Date not set" };
  const date = new Date(`${dateKey(value)}T12:00:00`);
  return {
    day: new Intl.DateTimeFormat("en-GB", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date).toUpperCase(),
    full: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(date),
  };
};
const bandColours = ["#ff5a36", "#177a75", "#7057c7", "#bb7a16", "#2374ab", "#a84967"];
const tourColours = ["#177a75", "#7057c7", "#bb7a16", "#2374ab", "#a84967", "#54752b"];
const tourColour = (name?: string | null) => {
  if (!name) return "#b8afa2";
  const hash = [...name].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0);
  return tourColours[hash % tourColours.length];
};
const territoryLabel = (workspace: Workspace) => {
  if (workspace.grantScopes.some((scope) => scope.scopeType === "all")) return "All territories";
  const countries = [...new Set(workspace.grantScopes.flatMap((scope) => scope.countries || []))];
  const named = countries.map((country) => country.startsWith("@region:") ? country.slice(8) : country);
  const specific = workspace.grantScopes.filter((scope) => scope.scopeType === "tour" || scope.scopeType === "show").length;
  return [named.join(", "), specific ? `${specific} specific tour/show grant${specific === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ") || "No territory scope";
};

export default function AgentPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [proposals, setProposals] = useState<ShowProposal[]>([]);
  const [proposalWorkspaces, setProposalWorkspaces] = useState<ProposalWorkspace[]>([]);
  const [proposalFormOpen, setProposalFormOpen] = useState(false);
  const [proposalToRevise, setProposalToRevise] = useState<ShowProposal | null>(null);
  const [selected, setSelected] = useState("all");
  const [showPeriod, setShowPeriod] = useState<"upcoming" | "past">("upcoming");
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAgency, setProfileAgency] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [diaryMonth, setDiaryMonth] = useState(() => { const value = new Date(); value.setDate(1); value.setHours(12, 0, 0, 0); return value; });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invitations, setInvitations] = useState<BandInvitation[]>([]);
  const [showCreateBand, setShowCreateBand] = useState(false);
  const [submittingBand, setSubmittingBand] = useState(false);
  const [locationPending, setLocationPending] = useState(false);
  const [locationPickerKey, setLocationPickerKey] = useState(0);
  const [bandMessage, setBandMessage] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [bandForm, setBandForm] = useState<BandForm>(emptyBandForm);
  const setActiveProfile = useProfileStore((state) => state.setActiveProfile);

  function openBandWorkspace(invitation: BandInvitation, destination: "/shows" | "/tours") {
    if (!invitation.entityId || !session?.user?.id) return;
    setActiveProfile({
      id: invitation.entityId,
      name: invitation.bandName,
      entityType: "artist",
      administratorId: session.user.id,
      membershipRole: "provisional_agent",
      city: invitation.city,
      country: invitation.country,
      latitude: invitation.latitude ?? undefined,
      longitude: invitation.longitude ?? undefined,
    });
    router.push(destination);
  }

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.replace("/login?callbackUrl=/agent");
      return;
    }
    Promise.all([fetch("/api/booking-agent/profile", { cache: "no-store" }), fetch("/api/agent/workspaces", { cache: "no-store" }), fetch("/api/agent/day-sheets", { cache: "no-store" }), fetch("/api/agent/band-invitations", { cache: "no-store" }), fetch("/api/my-show-proposals", { cache: "no-store" })])
      .then(async ([profileResponse, workspaceResponse, showResponse, invitationResponse, proposalResponse]) => {
        if (!profileResponse.ok) throw new Error("Unable to load your booking-agent profile");
        const profileData = await profileResponse.json();
        if (!profileData.profile) {
          router.replace("/onboarding");
          return;
        }
        setProfile(profileData.profile);
        setProfileName(profileData.profile.displayName || "");
        setProfileAgency(profileData.profile.agencyName || "");
        const workspaceData = await workspaceResponse.json();
        const showData = await showResponse.json();
        if (!workspaceResponse.ok || !showResponse.ok) throw new Error("Unable to load represented bands");
        setWorkspaces(workspaceData.workspaces || []);
        setShows(showData.shows || []);
        if (invitationResponse.ok) setInvitations((await invitationResponse.json()).invitations || []);
        if (proposalResponse.ok) {
          const proposalData = await proposalResponse.json();
          setProposals((proposalData.proposals || []).map((item: Record<string, unknown>) => normaliseProposal(item)));
          setProposalWorkspaces((proposalData.workspaces || []).map((item: Record<string, unknown>) => normaliseWorkspace(item)));
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to open the agent portal"))
      .finally(() => setLoading(false));
  }, [router, status]);

  async function createBandInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invitationUrl) {
      setInvitationUrl("");
      setBandMessage("");
      setBandForm(emptyBandForm());
      setLocationPickerKey((current) => current + 1);
      return;
    }
    if (locationPending) {
      setBandMessage("Choose the home city from the Google Places suggestions before sending the invitation.");
      return;
    }
    setSubmittingBand(true);
    setBandMessage("");
    try {
      const response = await fetch("/api/agent/band-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bandForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Unable to create the band invitation");
      setInvitations((current) => [data.invitation, ...current]);
      setInvitationUrl(data.invitationUrl || "");
      setBandMessage(data.emailDelivered ? `Invitation emailed to ${data.invitation.recipientEmail}.` : "The profile was created, but email delivery failed. Copy the secure link below.");
    } catch (caught) {
      setBandMessage(caught instanceof Error ? caught.message : "Unable to create the band invitation");
    } finally {
      setSubmittingBand(false);
    }
  }

  async function saveAgentProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || profileSaving) return;
    setProfileSaving(true);
    setProfileMessage("");
    try {
      const response = await fetch("/api/booking-agent/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, displayName: profileName.trim(), agencyName: profileAgency.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Unable to update your booking-agent profile");
      setProfile(data.profile);
      setProfileEditorOpen(false);
    } catch (caught) {
      setProfileMessage(caught instanceof Error ? caught.message : "Unable to update your booking-agent profile");
    } finally {
      setProfileSaving(false);
    }
  }

  const activeWorkspaceIds = useMemo(() => new Set(workspaces.map((workspace) => workspace.id)), [workspaces]);
  const visibleShows = useMemo(() => [...(selected === "all" ? shows : shows.filter((show) => show.entityId === selected))].sort((a, b) => dateKey(a.showDate).localeCompare(dateKey(b.showDate))), [selected, shows]);
  const visibleProposals = useMemo(() => (selected === "all" ? proposals.filter((proposal) => activeWorkspaceIds.has(proposal.entityId)) : proposals.filter((proposal) => proposal.entityId === selected)), [activeWorkspaceIds, proposals, selected]);
  const eligibleProposalWorkspaces = useMemo(() => selected === "all" ? proposalWorkspaces : proposalWorkspaces.filter((workspace) => workspace.id === selected), [proposalWorkspaces, selected]);
  const pendingProposalCount = visibleProposals.filter((proposal) => proposal.status === "pending" || proposal.status === "changes_requested").length;
  const todayKey = dateKey(new Date().toISOString());
  const upcomingShows = useMemo(() => visibleShows.filter((show) => dateKey(show.showDate) >= todayKey && String(show.status || "").toLowerCase() !== "cancelled"), [todayKey, visibleShows]);
  const futureAssignedShows = useMemo(() => visibleShows.filter((show) => !dateKey(show.showDate) || dateKey(show.showDate) >= todayKey), [todayKey, visibleShows]);
  const pastAssignedShows = useMemo(() => visibleShows.filter((show) => dateKey(show.showDate) && dateKey(show.showDate) < todayKey).reverse(), [todayKey, visibleShows]);
  const assignedShows = showPeriod === "upcoming" ? futureAssignedShows : pastAssignedShows;
  const agentName = profile?.displayName || session?.user?.name || "Booking agent";
  const agentInitials = agentName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "BA";
  const nextShow = upcomingShows[0];
  const nextShowDate = displayDate(nextShow?.showDate);
  const bandColour = useMemo(() => new Map(workspaces.map((workspace, index) => [workspace.id, bandColours[index % bandColours.length]])), [workspaces]);
  const diaryCells = useMemo(() => {
    const year = diaryMonth.getFullYear();
    const month = diaryMonth.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: Math.ceil((firstWeekday + days) / 7) * 7 }, (_, index) => {
      const day = index - firstWeekday + 1;
      if (day < 1 || day > days) return null;
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { day, key, shows: visibleShows.filter((show) => dateKey(show.showDate) === key) };
    });
  }, [diaryMonth, visibleShows]);
  const diaryLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(diaryMonth);
  const totals = useMemo(
    () =>
      visibleShows.reduce<Record<string, number>>((result, show) => {
        const currency = show.currency?.trim().toUpperCase();
        const guarantee = Number(show.guarantee);
        if (show.financialAccess !== "hidden" && currency && /^[A-Z]{3}$/.test(currency) && Number.isFinite(guarantee)) result[currency] = (result[currency] || 0) + (guarantee * Number(show.commissionPercentage || 0)) / 100;
        return result;
      }, {}),
    [visibleShows],
  );
  const openCreateBand = () => {
    setShowCreateBand(true);
    setBandMessage("");
    setInvitationUrl("");
    setBandForm(emptyBandForm());
    setLocationPickerKey((current) => current + 1);
  };

  return (
    <main className="min-h-[100dvh] bg-[#f3ede3] text-[#171713]">
      <header className="mobile-safe-top border-b border-white/10 bg-[#11130f] text-white">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between px-4 md:px-8">
          <SceneGenWordmark />
          <details className="group relative">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-full border border-white/15 py-1.5 pl-1.5 pr-4 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ff5a36] text-xs font-black">{agentInitials}</span>
              <span className="hidden min-w-0 text-left sm:block"><span className="block max-w-48 truncate text-sm font-black">{agentName}</span><span className="mt-0.5 block max-w-48 truncate text-[9px] font-bold uppercase tracking-[.16em] text-white/50">{profile?.agencyName || "Independent booking agent"}</span></span>
            </summary>
            <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#1b1d19] shadow-2xl">
              <div className="border-b border-white/10 p-4"><p className="font-black">{agentName}</p><p className="mt-1 text-sm text-white/60">{profile?.agencyName || "Independent booking agent"}</p><p className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#ff7756]"><BriefcaseBusiness size={13}/> Booking agent</p>{session?.user?.email && <p className="mt-2 truncate text-xs text-white/40">{session.user.email}</p>}</div>
              <button type="button" onClick={() => { setProfileName(profile?.displayName || ""); setProfileAgency(profile?.agencyName || ""); setProfileMessage(""); setProfileEditorOpen(true); }} className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-bold hover:bg-white/5"><UserRound size={16}/> Edit booking-agent profile</button>
              <button type="button" onClick={() => void signOut({ callbackUrl: "/app" })} className="flex min-h-12 w-full items-center gap-3 border-t border-white/10 px-4 text-left text-sm font-bold hover:bg-white/5"><LogOut size={16}/> Sign out</button>
            </div>
          </details>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e74428]">Booking agent workspace</p>
            <h1 className="mt-2 text-4xl font-black">Booking desk</h1>
            <p className="mt-2 text-[#686258]">Shows, proposals and day sheets across your represented roster.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {eligibleProposalWorkspaces.length > 0 && <button onClick={() => setProposalFormOpen(true)} className="flex min-h-12 items-center gap-2 rounded-full bg-[#ff5a36] px-5 font-black text-white hover:bg-[#e84b29]"><Handshake size={18}/> Propose a show</button>}
            <button onClick={openCreateBand} className="flex min-h-12 items-center gap-2 rounded-full border border-[#171713] px-5 font-black"><Plus size={18} /> Invite a band</button>
          </div>
        </div>
        {loading ? (
          <p className="mt-8">Opening your agent workspace…</p>
        ) : error ? (
          <p className="mt-8 rounded-xl border border-[#ef9b88] bg-[#fff0eb] p-5 font-bold text-[#9d311e]">{error}</p>
        ) : (
          <>
            {!workspaces.length ? (
              <section className="mt-8 rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] p-8 text-center">
                <ShieldCheck className="mx-auto text-[#e74428]" size={38} />
                <h2 className="mt-4 text-2xl font-black">No represented bands yet</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#686258]">
                  A band can invite <strong>{session?.user?.email}</strong>, or you can create its provisional profile and invite the band owner from here.
                </p>
                <button onClick={openCreateBand} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#171713] px-5 text-sm font-black">
                  <Plus size={17} /> Create and invite a band
                </button>
              </section>
            ) : (
              <>
                <section className="mt-8 rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-5 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-black">Represented bands</h2>
                    <p className="mt-1 text-sm text-[#686258]">Every band keeps independent permissions and commission rates.</p>
                  </div>
                  <select value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-4 min-h-12 rounded-md border border-[#d8d0c3] bg-white px-4 font-bold sm:mt-0">
                    <option value="all">All represented bands</option>
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                </section>
                <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
                  <section className="relative min-h-[360px] overflow-hidden bg-[#ff5a36] p-7 text-white md:p-9">
                    <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:44px_44px]" />
                    <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full border-[55px] border-white/10" />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[.25em] text-white/75">Next movement</p><span className="rounded-full border border-white/30 px-3 py-1 text-[9px] font-black uppercase tracking-[.16em]">{selected === "all" ? "Across your roster" : workspaces.find((workspace) => workspace.id === selected)?.name}</span></div>
                      {nextShow ? <>
                        <div className="mt-10 flex items-end gap-5"><span className="text-[92px] font-black leading-[.78] tracking-[-.08em] md:text-[130px]">{nextShowDate.day}</span><span className="pb-2 text-2xl font-black">{nextShowDate.month}</span></div>
                        <div className="mt-auto flex flex-col justify-between gap-6 border-t border-white/30 pt-6 md:flex-row md:items-end"><div><p className="text-xs font-black uppercase tracking-[.18em] text-white/70">{nextShow.workspaceName}</p><p className="mt-2 text-3xl font-black tracking-[-.035em]">{nextShow.venueCity || "City pending"}</p><p className="mt-2 flex items-center gap-2 text-sm text-white/75"><MapPin size={16}/>{nextShow.venueName || "Venue pending"}{nextShow.venueCountry ? ` · ${nextShow.venueCountry}` : ""}</p></div><button onClick={() => router.push(`/agent/shows/${nextShow.id}`)} className="flex min-h-11 items-center gap-2 text-sm font-black">Open show file <ArrowUpRight size={16}/></button></div>
                      </> : <div className="my-auto"><p className="max-w-2xl text-5xl font-black leading-[.95] tracking-[-.05em] md:text-7xl">Nothing booked ahead.</p><p className="mt-6 text-base text-white/75">Propose the next date for one of your represented bands.</p></div>}
                    </div>
                  </section>
                  <section className="flex min-h-[360px] flex-col bg-[#171713] p-7 text-white md:p-8">
                    <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#ff7756]">Action board</p><h2 className="mt-2 text-2xl font-black">What needs moving</h2></div><span className="grid h-9 min-w-9 place-items-center rounded-full bg-white/10 text-sm font-black">{pendingProposalCount}</span></div>
                    <div className="mt-7 flex-1 divide-y divide-white/10 border-y border-white/10">
                      {pendingProposalCount ? visibleProposals.filter((proposal) => ["pending", "changes_requested"].includes(proposal.status)).slice(0, 4).map((proposal) => <button key={proposal.id} onClick={() => proposal.status === "changes_requested" && (setProposalToRevise(proposal), setProposalFormOpen(true))} className="flex w-full items-center gap-4 py-4 text-left"><span className="w-16 text-[9px] font-black uppercase tracking-[.12em] text-[#ff7756]">{statusLabel(proposal.status)}</span><span className="flex-1"><span className="block text-sm font-bold">{proposal.workspaceName} · {proposal.venueName}</span><span className="mt-1 block text-xs text-white/40">{displayDate(proposal.showDate).full}</span></span><ArrowUpRight size={16} className="text-white/30"/></button>) : <div className="flex min-h-48 items-center justify-center text-center"><div><CheckCircle2 className="mx-auto text-[#78d39b]"/><p className="mt-4 font-bold">Nothing urgent</p><p className="mt-2 text-xs text-white/40">Your booking desk is in good shape.</p></div></div>}
                    </div>
                  </section>
                </div>
                <section className="mt-5 grid border border-[#d4cdbf] bg-[#fffaf1] md:grid-cols-3">
                  {[{ label: "Shows ahead", value: upcomingShows.length }, { label: "Represented bands", value: workspaces.length }, { label: "Open proposals", value: pendingProposalCount }].map((item, index) => <div key={item.label} className={`flex min-h-28 items-center justify-between p-6 ${index ? "border-t border-[#d4cdbf] md:border-l md:border-t-0" : ""}`}><div><p className="text-4xl font-black tracking-[-.05em]">{item.value}</p><p className="mt-2 text-[9px] font-black uppercase tracking-[.2em] text-[#7e776c]">{item.label}</p></div><CalendarDays className="text-[#aaa194]" size={21}/></div>)}
                </section>
                <section className="mt-8 overflow-hidden border border-[#d4cdbf] bg-[#fffaf1]">
                  <div className="flex flex-col gap-4 border-b border-[#d4cdbf] p-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#ff5a36]">Roster diary</p><h2 className="mt-2 text-2xl font-black">Booked shows</h2><p className="mt-1 text-sm text-[#756f65]">Confirmed, tentative and proposed dates across the bands you represent.</p></div><div className="flex items-center gap-2"><button aria-label="Previous month" onClick={() => setDiaryMonth(new Date(diaryMonth.getFullYear(), diaryMonth.getMonth() - 1, 1, 12))} className="grid h-11 w-11 place-items-center border border-[#c9c1b4]"><ChevronLeft size={18}/></button><p className="min-w-40 text-center font-black">{diaryLabel}</p><button aria-label="Next month" onClick={() => setDiaryMonth(new Date(diaryMonth.getFullYear(), diaryMonth.getMonth() + 1, 1, 12))} className="grid h-11 w-11 place-items-center border border-[#c9c1b4]"><ChevronRight size={18}/></button></div></div>
                  <div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-7 border-b border-[#d4cdbf] bg-[#e8e0d4]">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="p-3 text-[9px] font-black uppercase tracking-[.18em] text-[#756f65]">{day}</div>)}</div><div className="grid grid-cols-7">{diaryCells.map((cell, index) => <div key={cell?.key || `blank-${index}`} className="min-h-32 border-b border-r border-[#ddd5c8] p-2"><p className={`text-xs font-black ${cell?.key === todayKey ? "text-[#ff5a36]" : "text-[#756f65]"}`}>{cell?.day || ""}</p>{cell?.shows.map((show) => <button key={show.id} onClick={() => router.push(`/agent/shows/${show.id}`)} className="mt-2 block w-full border-l-4 bg-white p-2 text-left shadow-sm" style={{ borderLeftColor: show.tourName ? tourColour(show.tourName) : "#b8afa2" }}><span className="block truncate text-[9px] font-black uppercase" style={{ color: bandColour.get(show.entityId || "") || "#ff5a36" }}>{show.workspaceName}</span><span className="mt-1 block truncate text-xs font-bold">{show.venueCity || show.venueName || "Venue TBC"}</span><span className="mt-1 flex items-center gap-1 truncate text-[9px] uppercase text-[#756f65]">{show.tourName ? <><Route size={10}/>{show.tourName}</> : <><CalendarDays size={10}/>Standalone</>}</span></button>)}</div>)}</div></div></div>
                  <div className="flex flex-wrap gap-4 border-t border-[#d4cdbf] p-4">{workspaces.filter((workspace) => selected === "all" || workspace.id === selected).map((workspace) => <span key={workspace.id} className="flex items-center gap-2 text-xs font-bold"><span className="h-3 w-3" style={{ background: bandColour.get(workspace.id) }}/>{workspace.name}</span>)}</div>
                </section>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {workspaces
                    .filter((workspace) => selected === "all" || workspace.id === selected)
                    .map((workspace) => (
                      <article key={workspace.id} className="rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-5">
                        <h3 className="text-lg font-black">{workspace.name}</h3>
                        <p className="mt-2 text-sm font-bold text-[#686258]">
                          {workspace.accessLevels.includes("editor") ? "Can edit" : "View only"}
                          {workspace.canProposeShows ? " · Can propose shows" : ""}
                        </p>
                        <p className="mt-2 text-sm leading-5 text-[#686258]"><MapPin className="mr-1 inline" size={14}/>{territoryLabel(workspace)}</p>
                        <p className="mt-2 text-xs text-[#80786e]">{workspace.financialAccess.includes("edit") ? "Can edit financials" : workspace.financialAccess.includes("view") ? "Can view financials" : "Financials hidden"} · {workspace.activeGrantCount} active permission {workspace.activeGrantCount === 1 ? "grant" : "grants"}</p>
                        <p className="mt-4 text-2xl font-black">{workspace.commissionPercentage == null ? "Rate not set" : `${workspace.commissionPercentage}%`}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#80786e]">Private commission rate</p>
                      </article>
                    ))}
                </div>
                {Object.keys(totals).length > 0 && (
                  <section className="mt-5 bg-[#171713] p-5 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ff8068]">Estimated commission · separate currencies</p>
                    <div className="mt-3 flex flex-wrap gap-8">
                      {Object.entries(totals).map(([currency, total]) => (
                        <p key={currency} className="text-2xl font-black">
                          {money(total, currency)}
                        </p>
                      ))}
                    </div>
                  </section>
                )}
                <section className="mt-8">
                  <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e74428]">Offer pipeline</p><h2 className="mt-1 text-2xl font-black">Show proposals</h2><p className="mt-1 text-sm text-[#686258]">{pendingProposalCount} awaiting a decision or revision</p></div>{eligibleProposalWorkspaces.length > 0 && <button onClick={() => setProposalFormOpen(true)} className="flex min-h-11 items-center gap-2 rounded-full bg-[#171713] px-5 text-sm font-black text-white"><Plus size={16}/> New proposal</button>}</div>
                  {visibleProposals.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{visibleProposals.map((proposal) => <article key={proposal.id} className="rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-[#e74428]">{proposal.workspaceName}</p><h3 className="mt-2 text-xl font-black">{proposal.venueName}</h3></div><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${proposal.status === "accepted" ? "bg-[#e6efd3] text-[#536b14]" : proposal.status === "declined" ? "bg-[#f5dfd9] text-[#9d311e]" : proposal.status === "changes_requested" ? "bg-[#fff0bf] text-[#775b00]" : "bg-[#e5ddd1] text-[#625e55]"}`}>{statusLabel(proposal.status)}</span></div><p className="mt-3 text-sm"><CalendarDays className="mr-2 inline" size={15}/>{new Date(`${proposal.showDate.slice(0, 10)}T12:00:00`).toLocaleDateString()}</p><p className="mt-2 text-sm"><MapPin className="mr-2 inline" size={15}/>{[proposal.city, proposal.country].filter(Boolean).join(", ")}</p><p className="mt-3 text-lg font-black">{money(proposal.offerAmount, proposal.currency)}</p>{proposal.decisionNote && <p className="mt-3 border-l-2 border-[#e74428] pl-3 text-sm text-[#686258]">{proposal.decisionNote}</p>}{proposal.status === "changes_requested" && <button onClick={() => { setProposalToRevise(proposal); setProposalFormOpen(true); }} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#171713] text-sm font-black text-white"><Pencil size={15}/> Revise and resubmit</button>}</article>)}</div> : <p className="mt-4 rounded-xl bg-[#fffaf2] p-5 text-[#686258]">No proposals for this selection yet.</p>}
                </section>
                <section className="mt-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e74428]">Live schedule</p><h2 className="mt-1 text-2xl font-black">Assigned shows</h2></div>
                    <div role="tablist" aria-label="Show period" className="inline-flex rounded-full border border-[#cfc6b8] bg-[#e9e1d5] p-1">
                      <button type="button" role="tab" aria-selected={showPeriod === "upcoming"} onClick={() => setShowPeriod("upcoming")} className={`min-h-10 rounded-full px-4 text-sm font-black transition ${showPeriod === "upcoming" ? "bg-[#171713] text-white shadow-sm" : "text-[#686258] hover:text-[#171713]"}`}>
                        Upcoming shows <span className="ml-1 opacity-60">{futureAssignedShows.length}</span>
                      </button>
                      <button type="button" role="tab" aria-selected={showPeriod === "past"} onClick={() => setShowPeriod("past")} className={`min-h-10 rounded-full px-4 text-sm font-black transition ${showPeriod === "past" ? "bg-[#171713] text-white shadow-sm" : "text-[#686258] hover:text-[#171713]"}`}>
                        Past shows <span className="ml-1 opacity-60">{pastAssignedShows.length}</span>
                      </button>
                    </div>
                  </div>
                  {assignedShows.length ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {assignedShows.map((show) => (
                        <Link key={show.id} href={`/agent/shows/${encodeURIComponent(show.id)}`} style={{ borderLeftColor: show.tourName ? tourColour(show.tourName) : "#b8afa2" }} className="group block rounded-xl border border-l-4 border-[#d8d0c3] bg-[#fffaf2] p-5 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e74428]" aria-label={`Open ${show.venueName || show.venueCity || "show"} day sheet`}>
                          <p className="text-xs font-black uppercase text-[#e74428]">{show.workspaceName}</p>
                          <h3 className="mt-2 text-xl font-black">{show.venueName || show.venueCity || "Venue TBC"}</h3>
                          <p className="mt-3 flex items-center gap-2 text-sm">
                            <CalendarDays size={16} />
                            {show.showDate ? new Date(`${dateKey(show.showDate)}T12:00:00`).toLocaleDateString() : "Date TBC"}
                          </p>
                          <p className="mt-2 flex items-center gap-2 text-sm">
                            <MapPin size={16} />
                            {[show.venueCity, show.venueCountry].filter(Boolean).join(", ") || "Location TBC"}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e5ddd1] pt-4"><span className="rounded-full bg-[#efe8dc] px-3 py-1 text-[10px] font-black uppercase">{show.accessLevel === "editor" ? "Open day-sheet editor" : "Open day sheet"}</span><span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase" style={{ color: show.tourName ? tourColour(show.tourName) : "#746d63", backgroundColor: show.tourName ? `${tourColour(show.tourName)}16` : "#eee7dc" }}>{show.tourName ? <><Route size={12}/> Tour · {show.tourName}</> : <><CalendarDays size={12}/> Standalone show</>}</span><ArrowUpRight className="ml-auto text-[#8a8378] transition group-hover:text-[#e74428]" size={17}/></div>
                          {show.financialAccess !== "hidden" && show.currency && Number.isFinite(Number(show.guarantee)) && <p className="mt-3 text-sm"><strong>{money(Number(show.guarantee), show.currency)}</strong> fee{show.commissionPercentage != null ? ` · ${money(Number(show.guarantee) * Number(show.commissionPercentage) / 100, show.currency)} est. commission` : ""}</p>}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-[#fffaf2] p-5 text-[#686258]">No {showPeriod === "upcoming" ? "upcoming" : "past"} assigned shows match this band.</p>
                  )}
                </section>
              </>
            )}
            {invitations.length > 0 && (
              <section className="mt-8">
                <h2 className="text-2xl font-black">Band invitations</h2>
                <p className="mt-1 text-sm text-[#686258]">Pending ownership does not stop you planning the band&apos;s work.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {invitations.map((invitation) => (
                    <article key={invitation.id} className="rounded-xl border border-[#d8d0c3] bg-[#fffaf2] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black">{invitation.bandName}</h3>
                          <p className="mt-1 text-sm text-[#686258]">{invitation.recipientEmail}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] ${invitation.status === "accepted" ? "bg-[#e6efd0] text-[#445817]" : "bg-[#efe6d8] text-[#756b5d]"}`}>{invitation.status}</span>
                      </div>
                      {invitation.status === "pending" && invitation.entityId && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          <button onClick={() => openBandWorkspace(invitation, "/shows")} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#171713] px-4 text-sm font-black text-white">
                            <CalendarDays size={16} /> Shows
                          </button>
                          <button onClick={() => openBandWorkspace(invitation, "/tours")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#171713] px-4 text-sm font-black">
                            Tours
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        {showCreateBand && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="create-band-title">
            <form onSubmit={createBandInvitation} className="mobile-safe-bottom max-h-[100dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-[#fffaf2] p-6 shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e74428]">Reverse invitation</p>
                  <h2 id="create-band-title" className="mt-2 text-3xl font-black">
                    Create a band profile
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#686258]">The profile stays provisional until the band contact accepts ownership. Acceptance also connects you as its booking agent.</p>
                </div>
                <button type="button" onClick={() => setShowCreateBand(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d8d0c3]" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Band name
                  <input required maxLength={255} value={bandForm.bandName} onChange={(event) => setBandForm({ ...bandForm, bandName: event.target.value })} className="mt-2 min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 font-normal" />
                </label>
                <label className="text-sm font-bold">
                  Band contact name
                  <input
                    maxLength={120}
                    value={bandForm.recipientName}
                    onChange={(event) =>
                      setBandForm({
                        ...bandForm,
                        recipientName: event.target.value,
                      })
                    }
                    className="mt-2 min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 font-normal"
                  />
                </label>
                <label className="text-sm font-bold sm:col-span-2">
                  Band owner email
                  <input
                    required
                    type="email"
                    value={bandForm.recipientEmail}
                    onChange={(event) =>
                      setBandForm({
                        ...bandForm,
                        recipientEmail: event.target.value,
                      })
                    }
                    className="mt-2 min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 font-normal"
                  />
                  <span className="mt-2 block text-xs font-normal text-[#777168]">This exact email must sign in to accept ownership.</span>
                </label>
                <div className="sm:col-span-2">
                  <ContactLocationPicker key={locationPickerKey} location={bandForm} onPendingChange={setLocationPending} onChange={(location) => setBandForm((current) => ({ ...current, ...location }))} />
                </div>
                <label className="text-sm font-bold sm:col-span-2">
                  Short bio
                  <textarea maxLength={5000} rows={3} value={bandForm.bio} onChange={(event) => setBandForm({ ...bandForm, bio: event.target.value })} className="mt-2 w-full rounded-md border border-[#d8d0c3] bg-white p-4 font-normal" />
                </label>
              </div>
              {bandMessage && <p className="mt-5 rounded-md border border-[#d8d0c3] bg-white p-4 text-sm font-bold">{bandMessage}</p>}
              {invitationUrl && (
                <div className="mt-3 flex gap-2">
                  <input readOnly value={invitationUrl} className="min-w-0 flex-1 rounded-md border border-[#d8d0c3] bg-white px-3 text-xs" />
                  <button type="button" onClick={() => void copyText(invitationUrl)} className="flex min-h-11 items-center gap-2 rounded-full border border-[#171713] px-4 text-sm font-black">
                    <Copy size={15} /> Copy
                  </button>
                </div>
              )}
              <div className="mt-7 flex justify-end">
                <button disabled={submittingBand || locationPending} className="flex min-h-12 items-center gap-2 rounded-full bg-[#ff5a36] px-6 font-black text-white disabled:opacity-50">
                  {invitationUrl ? <Check size={18} /> : <Plus size={18} />} {submittingBand ? "Creating…" : invitationUrl ? "Create another" : "Create profile and send invite"}
                </button>
              </div>
            </form>
          </div>
        )}
        {profileEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="agent-profile-title">
            <form onSubmit={saveAgentProfile} className="mobile-safe-bottom w-full max-w-lg rounded-t-2xl bg-[#fffaf2] p-6 shadow-2xl sm:rounded-2xl sm:p-8">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e74428]">Professional identity</p><h2 id="agent-profile-title" className="mt-2 text-3xl font-black">Booking-agent profile</h2><p className="mt-2 text-sm leading-6 text-[#686258]">This identifies you to the artists you represent.</p></div><button type="button" onClick={() => setProfileEditorOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d8d0c3]" aria-label="Close profile editor"><X size={18}/></button></div>
              <div className="mt-7 grid gap-5">
                <label className="text-sm font-bold">Full name<input required minLength={2} maxLength={120} value={profileName} onChange={(event) => setProfileName(event.target.value)} className="mt-2 min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 font-normal" autoComplete="name" /></label>
                <label className="text-sm font-bold">Agency name <span className="font-normal text-[#777168]">(optional)</span><input maxLength={200} value={profileAgency} onChange={(event) => setProfileAgency(event.target.value)} className="mt-2 min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 font-normal" autoComplete="organization" placeholder="Independent booking agent" /></label>
              </div>
              {profileMessage && <p className="mt-5 rounded-md bg-[#fff0eb] p-4 text-sm font-bold text-[#9d311e]">{profileMessage}</p>}
              <div className="mt-7 flex justify-end gap-2"><button type="button" onClick={() => setProfileEditorOpen(false)} className="min-h-12 rounded-full border border-[#171713] px-5 font-black">Cancel</button><button disabled={profileSaving || profileName.trim().length < 2} className="min-h-12 rounded-full bg-[#ff5a36] px-6 font-black text-white disabled:opacity-50">{profileSaving ? "Saving…" : "Save profile"}</button></div>
            </form>
          </div>
        )}
        {proposalFormOpen && <ShowProposalForm apiMode="account" workspaces={eligibleProposalWorkspaces} initialProposal={proposalToRevise} onClose={() => { setProposalFormOpen(false); setProposalToRevise(null); }} onSaved={(proposal) => { const workspace = proposalWorkspaces.find((item) => item.id === proposal.entityId); setProposals((current) => proposalToRevise ? current.map((item) => item.id === proposal.id ? { ...proposal, workspaceName: item.workspaceName || workspace?.name } : item) : [{ ...proposal, workspaceName: workspace?.name }, ...current]); setProposalFormOpen(false); setProposalToRevise(null); }} />}
      </div>
    </main>
  );
}
