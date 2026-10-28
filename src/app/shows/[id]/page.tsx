"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft, CircleAlert,
  Clock3, Contact, FileText, Mail, MapPin, Navigation, Pencil, Phone, Printer, ReceiptText, Save, Share2, X,
} from "lucide-react";
import ShareShowModal from "@/components/shows/ShareShowModal";
import DaySheetActivity from "@/components/shows/DaySheetActivity";
import { getEntityId } from "@/lib/entity";
import type { Show } from "@/types/show";
import AdvanceChecklist from "@/components/shows/AdvanceChecklist";
import DailyItinerary from "@/components/shows/DailyItinerary";
import ScheduleTemplates from "@/components/shows/ScheduleTemplates";
import GuestList from "@/components/shows/GuestList";
import DaySheetDisclosure from "@/components/shows/DaySheetDisclosure";
import TravelAccommodation from "@/components/shows/TravelAccommodation";
import DocumentVault from "@/components/shows/DocumentVault";
import ShowUpdates from "@/components/shows/ShowUpdates";
import { MobileDaySheet } from "@/components/shows/mobile-day-sheet";
import { useOfflineStatus } from "@/components/providers/offline-provider";
import { loadOfflineShow, saveOfflineShow } from "@/lib/offline-road-pack";
import { loadDaySheetDraft, removeDaySheetDraft, saveDaySheetDraft } from "@/lib/day-sheet-draft";
import VenueDirectoryAutocomplete, { type StoredVenue } from "@/components/shows/VenueDirectoryAutocomplete";

type EditableShow = Pick<Show,
  "showDate" | "loadInTime" | "soundCheckTime" | "doorsTime" | "showTime" | "endTime" |
  "festivalName" | "venueName" | "venueId" | "venuePlaceId" | "countryCode" | "postalCode" | "venueAddress" | "venueCity" | "venueState" | "venueCountry" | "venueCapacity" | "latitude" | "longitude" |
  "contactName" | "contactEmail" | "contactPhone" | "dealType" | "guarantee" | "currency" |
  "ticketPrice" | "isPaid" | "status" | "notes"
>;

const EMPTY = "Not set";

function localDate(value: string) {
  if (!value) return EMPTY;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function time(value?: string) {
  return value ? value.slice(0, 5) : EMPTY;
}

function money(value?: number, currency?: string) {
  if (value === undefined || value === null) return EMPTY;
  if (!currency) return `${value.toLocaleString()} (currency not set)`;
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value); }
  catch { return `${value.toFixed(2)} ${currency}`; }
}

function errorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object" || !("error" in data)) return fallback;
  const error = (data as { error?: unknown }).error;
  if (typeof error === "string") {
    try {
      const parsed = JSON.parse(error) as { error?: { message?: string } };
      return parsed.error?.message || error;
    } catch {
      return error;
    }
  }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    const details = "details" in error && typeof error.details === "string" ? error.details : "";
    return details && details !== error.message ? `${error.message}: ${details}` : error.message;
  }
  return fallback;
}

function toForm(show: Show): EditableShow {
  return {
    showDate: show.showDate?.slice(0, 10) || "",
    loadInTime: show.loadInTime || "", soundCheckTime: show.soundCheckTime || "",
    doorsTime: show.doorsTime || "", showTime: show.showTime || "", endTime: show.endTime || "",
    festivalName: show.festivalName || "", venueName: show.venueName || "", venueId: show.venueId, venuePlaceId: show.venuePlaceId,
    countryCode: show.countryCode, postalCode: show.postalCode, venueAddress: show.venueAddress || "", venueCity: show.venueCity || "",
    venueState: show.venueState || "", venueCountry: show.venueCountry || "", venueCapacity: show.venueCapacity,
    latitude: show.latitude, longitude: show.longitude,
    contactName: show.contactName || "", contactEmail: show.contactEmail || "", contactPhone: show.contactPhone || "",
    dealType: show.dealType || "guarantee", guarantee: show.guarantee, currency: show.currency || "",
    ticketPrice: show.ticketPrice, isPaid: Boolean(show.isPaid), status: show.status || "draft", notes: show.notes || "",
  };
}

function scheduleIssues(values: Pick<EditableShow, "loadInTime" | "soundCheckTime" | "doorsTime" | "showTime" | "endTime">) {
  const entries = [
    ["Load-in", values.loadInTime], ["Soundcheck", values.soundCheckTime], ["Doors", values.doorsTime],
    ["On stage", values.showTime], ["Finish", values.endTime],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const minutes = (value: string) => { const [hours, mins] = value.slice(0, 5).split(":").map(Number); return hours * 60 + mins; };
  const issues: string[] = [];
  let previous: [string, number] | null = null;
  entries.forEach(([label, value]) => {
    let current = minutes(value);
    if (previous && current < previous[1]) {
      const overnightFinish = label === "Finish" && previous[1] >= 18 * 60 && current <= 6 * 60;
      if (overnightFinish) current += 24 * 60;
      else issues.push(`${label} is earlier than ${previous[0]}`);
    }
    previous = [label, current];
  });
  return issues;
}

function Field({ label, value, accent = false, inverse = false }: { label: string; value?: string | number; accent?: boolean; inverse?: boolean }) {
  const missing = value === undefined || value === null || value === "" || value === EMPTY;
  return <div className="border-t border-[#d8d0c3] py-4 first:border-t-0">
    <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.18em] ${inverse ? "text-white/50" : "text-[#777267]"}`}>{label}</p>
    <p className={`font-semibold ${missing ? (inverse ? "text-white/40" : "text-[#9b958a]") : accent ? "text-[#ff765d]" : inverse ? "text-white" : "text-[#171713]"}`}>{missing ? EMPTY : value}</p>
  </div>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string | number | undefined; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#625e55]">{label}</span>
    <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-[#d7cfc2] bg-white px-3 text-base text-[#171713] outline-none transition focus:border-[#ff5738] focus:ring-2 focus:ring-[#ff5738]/15 sm:h-11 sm:text-sm" />
  </label>;
}

function EditorSection({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="rounded-[22px] border border-[#ddd4c7] bg-[#fffaf2] p-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
    <legend className="mb-4 w-full text-[11px] font-black uppercase tracking-[.18em] text-[#e74829] sm:mb-3">{title}</legend>
    <div className="grid gap-5 md:grid-cols-2">{children}</div>
  </fieldset>;
}

export default function DaySheetPage() {
  const router = useRouter();
  const params = useParams();
  const showId = params.id as string;
  const { data: session, status: sessionStatus } = useSession();
  const { online } = useOfflineStatus();
  const [show, setShow] = useState<Show | null>(null);
  const [form, setForm] = useState<EditableShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [accessLevel, setAccessLevel] = useState("viewer");
  const [externalCollaborator, setExternalCollaborator] = useState(false);
  const [permissions, setPermissions] = useState<{ editScope: 'none' | 'advance' | 'full'; financialAccess: 'hidden' | 'view' | 'edit' } | null>(null);
  const [offlineSavedAt, setOfflineSavedAt] = useState<string | null>(null);
  const [offlineCopy, setOfflineCopy] = useState(false);
  const [offlineFinancialVisible, setOfflineFinancialVisible] = useState(false);
  const [refreshingOffline, setRefreshingOffline] = useState(false);
  const [updatesNeedAttention, setUpdatesNeedAttention] = useState(false);
  const [activeSection, setActiveSection] = useState<'show' | 'plan' | 'files'>('show');
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftChanges, setDraftChanges] = useState<Partial<EditableShow>>({});
  const hasLoadedShow = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorTriggerRef = useRef<HTMLElement | null>(null);

  const loadSavedCopy = useCallback(() => {
    const entityId = getEntityId();
    const userId = session?.user?.id;
    if (!entityId || !userId) return false;
    const snapshot = loadOfflineShow(showId, entityId, userId);
    if (!snapshot) return false;
    setShow(snapshot.show); setForm(toForm(snapshot.show)); setOfflineSavedAt(snapshot.savedAt);
    setOfflineCopy(true); setOfflineFinancialVisible(snapshot.financialVisible); setAccessLevel('viewer'); setExternalCollaborator(false); setPermissions(null); setError(''); setLoading(false);
    hasLoadedShow.current = true;
    return true;
  }, [session?.user?.id, showId]);

  const loadShow = useCallback(async (manualRefresh = false) => {
    const entityId = getEntityId();
    if (!hasLoadedShow.current) setLoading(true);
    if (manualRefresh) setRefreshingOffline(true);
    setError("");
    let response: Response;
    try {
      response = await fetch(`/api/shows/${showId}`, { credentials: "include", cache: "no-store", headers: entityId ? { "X-Entity-Id": entityId } : {} });
    } catch (caught) {
      if (!hasLoadedShow.current && loadSavedCopy()) return;
      if (!hasLoadedShow.current) setError(caught instanceof Error ? caught.message : "Day sheet could not be loaded");
      else if (manualRefresh) toast.error('The saved copy could not be refreshed');
      if (manualRefresh) setRefreshingOffline(false);
      return;
    } finally {
      setLoading(false);
    }
    try {
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 500 && !hasLoadedShow.current && loadSavedCopy()) return;
        throw new Error(errorMessage(data, "Day sheet could not be loaded"));
      }
      const loaded = data.show ?? data;
      const isExternalCollaborator = Boolean(data.externalCollaborator);
      const loadedPermissions = data.permissions || null;
      const loadedFinancialVisible = !isExternalCollaborator || loadedPermissions?.financialAccess !== 'hidden';
      setAccessLevel(data.accessLevel || "viewer"); setExternalCollaborator(isExternalCollaborator); setPermissions(loadedPermissions);
      setShow(loaded); setForm(toForm(loaded)); setOfflineCopy(false);
      hasLoadedShow.current = true;
      if (entityId && session?.user?.id) {
        const snapshot = saveOfflineShow(loaded, entityId, session.user.id, loadedFinancialVisible, 'automatic');
        setOfflineSavedAt(snapshot?.savedAt || loadOfflineShow(showId, entityId, session.user.id)?.savedAt || null);
      }
      if (manualRefresh) toast.success('Offline day sheet refreshed');
    } catch (caught) {
      if (!hasLoadedShow.current) setError(caught instanceof Error ? caught.message : "Day sheet could not be loaded");
      else if (manualRefresh) toast.error('The saved copy could not be refreshed');
    } finally {
      if (manualRefresh) setRefreshingOffline(false);
    }
  }, [showId, loadSavedCopy, session?.user?.id]);

  useEffect(() => {
    if (sessionStatus === "authenticated" && online) void loadShow();
    else if (sessionStatus === 'authenticated' && !online && !hasLoadedShow.current) loadSavedCopy();
  }, [sessionStatus, loadShow, loadSavedCopy, online]);

  const missing = useMemo(() => {
    if (!show || show.showType === "off_day" || show.showType === "travel_day") return [];
    return [
      ["Venue", show.venueName], ["Venue address", show.venueAddress], ["Load-in", show.loadInTime],
      ["Soundcheck", show.soundCheckTime], ["Doors", show.doorsTime], ["Show time", show.showTime],
      ["Promoter contact", show.contactName], ["Promoter phone or email", show.contactPhone || show.contactEmail],
    ].filter(([, value]) => !value).map(([label]) => label).filter((label): label is string => Boolean(label));
  }, [show]);
  const timingIssues = useMemo(() => show ? scheduleIssues(show) : [], [show]);
  const formTimingIssues = useMemo(() => form ? scheduleIssues(form) : [], [form]);

  const draftValues = (values: EditableShow): Partial<EditableShow> => {
    const next: Partial<EditableShow> = { ...values };
    if (externalCollaborator && permissions?.financialAccess !== 'edit') {
      for (const key of ['dealType', 'guarantee', 'currency', 'ticketPrice', 'isPaid'] as const) delete next[key];
    }
    if (externalCollaborator && permissions?.editScope === 'none') {
      const financialKeys = new Set<keyof EditableShow>(['dealType', 'guarantee', 'currency', 'ticketPrice', 'isPaid']);
      for (const key of Object.keys(next) as Array<keyof EditableShow>) if (!financialKeys.has(key)) delete next[key];
    }
    return next;
  };

  const updateMany = (changes: Partial<EditableShow>) => {
    if (!form) return;
    const next = { ...form, ...changes };
    const entityId = getEntityId();
    const userId = session?.user?.id;
    if (editing && entityId && userId && show) {
      const nextChanges = draftValues({ ...draftChanges, ...changes } as EditableShow);
      setDraftChanges(nextChanges);
      setDraftSavedAt(saveDaySheetDraft(showId, entityId, userId, show.updatedAt || '', nextChanges)?.savedAt || null);
    }
    setForm(next);
  };

  const update = <K extends keyof EditableShow>(key: K, value: EditableShow[K]) => updateMany({ [key]: value } as Partial<EditableShow>);

  const selectGoogleVenue = (place: google.maps.places.PlaceResult) => {
    const component = (types: string[], short = false) => {
      const match = (place.address_components || []).find((entry) => types.some((type) => entry.types.includes(type)));
      return match ? (short ? match.short_name : match.long_name) : '';
    };
    updateMany({ venueId: undefined, venuePlaceId: place.place_id || undefined, venueName: place.name || '',
      venueAddress: place.formatted_address || '', venueCity: component(['locality', 'postal_town', 'administrative_area_level_2']),
      venueState: component(['administrative_area_level_1']), venueCountry: component(['country']), countryCode: component(['country'], true),
      postalCode: component(['postal_code']), latitude: place.geometry?.location?.lat(), longitude: place.geometry?.location?.lng() });
  };

  const selectStoredVenue = (venue: StoredVenue) => updateMany({ venueId: venue.id, venuePlaceId: venue.googlePlaceId,
    venueName: venue.name, venueAddress: venue.address || '', venueCity: venue.city, venueState: venue.region || '',
    venueCountry: venue.country || '', countryCode: venue.countryCode, postalCode: venue.postalCode,
    latitude: venue.latitude, longitude: venue.longitude, venueCapacity: venue.capacity });

  const changeVenueQuery = (value: string) => updateMany({ venueId: undefined, venuePlaceId: undefined, venueName: value,
    venueAddress: '', latitude: undefined, longitude: undefined, countryCode: undefined, postalCode: undefined });

  const openEditor = () => {
    const entityId = getEntityId();
    const userId = session?.user?.id;
    const draft = entityId && userId ? loadDaySheetDraft<Partial<EditableShow>>(showId, entityId, userId) : null;
    editorTriggerRef.current = document.activeElement as HTMLElement | null;
    if (draft) { const changes = draftValues(draft.values as EditableShow); setForm({ ...toForm(show!), ...changes }); setDraftChanges(changes); setDraftSavedAt(draft.savedAt); toast.info('Unsaved day-sheet draft restored'); }
    else { setForm(toForm(show!)); setDraftChanges({}); setDraftSavedAt(null); }
    setEditing(true);
  };

  const discardDraft = () => {
    const entityId = getEntityId();
    const userId = session?.user?.id;
    if (entityId && userId) removeDaySheetDraft(showId, entityId, userId);
    setForm(toForm(show!)); setDraftChanges({}); setDraftSavedAt(null); setEditing(false);
  };

  useEffect(() => {
    if (!editing) return;
    const editor = editorRef.current;
    const focusable = () => Array.from(editor?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || []);
    focusable()[0]?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setEditing(false); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      editorTriggerRef.current?.focus();
    };
  }, [editing]);

  const save = async () => {
    if (!form) return;
    if (formTimingIssues.length) return toast.error("Check the run-of-show timings before saving");
    const entityId = getEntityId();
    const payload = draftValues(draftChanges as EditableShow);
    if (Object.keys(payload).length === 0) return toast.info("No changes to save");
    setSaving(true);
    try {
      const requestPayload: Record<string, unknown> = { ...payload };
      if ('venueCapacity' in payload) requestPayload.venueCapacity = form.venueCapacity == null ? null : Number(form.venueCapacity);
      if ('guarantee' in payload) requestPayload.guarantee = form.guarantee == null ? null : Number(form.guarantee);
      if ('ticketPrice' in payload) requestPayload.ticketPrice = form.ticketPrice == null ? null : Number(form.ticketPrice);
      const response = await fetch(`/api/shows/${showId}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", ...(entityId ? { "X-Entity-Id": entityId } : {}) },
        body: JSON.stringify(requestPayload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(errorMessage(data, "Day sheet could not be saved"));
      const saved = data.show ?? data;
      setShow(saved); setForm(toForm(saved)); setEditing(false);
      if (entityId && session?.user?.id) removeDaySheetDraft(showId, entityId, session.user.id);
      setDraftChanges({}); setDraftSavedAt(null);
      toast.success(data.pendingApproval ? "Changes sent for approval" : "Day sheet saved");
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "Day sheet could not be saved"); }
    finally { setSaving(false); }
  };

  if (loading || sessionStatus === "loading") return <main className="scene-page"><div className="mx-auto max-w-7xl animate-pulse"><div className="h-10 w-72 rounded bg-[#ded6c9]" /><div className="mt-8 h-96 rounded-3xl bg-[#e6ded1]" /></div></main>;
  if (error || !show || !form) return <main className="scene-page"><div className="mx-auto max-w-3xl rounded-3xl border border-[#d9d0c2] bg-[#fffaf2] p-10 text-center"><CircleAlert className="mx-auto mb-4 text-[#ff5738]" size={40}/><h1 className="text-3xl font-black">Day sheet unavailable</h1><p className="mt-3 text-[#69645a]">{error || "This show could not be found."}</p><button onClick={() => router.push("/shows")} className="mt-6 rounded-full bg-[#171713] px-6 py-3 font-bold text-white">Back to shows</button></div></main>;

  const itineraryDay = show.showType === "off_day" || show.showType === "travel_day";
  const displayTitle = show.festivalName || show.venueName || "Venue TBC";
  const location = [show.venueCity, show.venueState, show.venueCountry].filter(Boolean).join(", ") || EMPTY;
  const directionsDestination = show.venueAddress || [show.venueName, show.venueCity, show.venueState, show.venueCountry].filter(Boolean).join(", ");
  const entityId = getEntityId();
  const financialVisible = !externalCollaborator || permissions?.financialAccess !== 'hidden';
  const financialEditable = !externalCollaborator || permissions?.financialAccess === 'edit';
  const displayedFinancialVisible = offlineCopy ? offlineFinancialVisible : financialVisible;

  const refreshOffline = () => {
    if (!online) return toast.info('Reconnect to refresh this saved day sheet');
    void loadShow(true);
  };

  return <main id="day-sheet-print-root" className="scene-page day-sheet-print-root">
    <div className="mx-auto max-w-7xl">
      <nav className="day-sheet-no-print mb-4 grid grid-cols-3 rounded-2xl border border-[#d8d0c3] bg-[#e8e0d4] p-1 sm:hidden" aria-label="Show sheet sections">
        {([['show', 'Show'], ['plan', 'Plan'], ['files', 'Files']] as const).map(([section, label]) => <button key={section} type="button" onClick={() => setActiveSection(section)} aria-current={activeSection === section ? 'page' : undefined} className={`min-h-11 rounded-xl px-2 text-xs font-black transition ${activeSection === section ? 'bg-[#171713] text-white shadow-sm' : 'text-[#686258]'}`}>{label}</button>)}
      </nav>
      {activeSection === 'show' && <MobileDaySheet show={show} missing={missing} timingIssues={timingIssues} financialVisible={displayedFinancialVisible} canEdit={!offlineCopy && accessLevel !== "viewer"} canShare={!offlineCopy && !externalCollaborator} onBack={() => router.back()} onEdit={openEditor} onShare={() => setSharing(true)} onPrint={() => window.print()} offlineSavedAt={offlineSavedAt} offlineCopy={offlineCopy} online={online} refreshingOffline={refreshingOffline} onRefreshOffline={refreshOffline} />}
      <button onClick={() => router.back()} className="day-sheet-no-print mb-7 hidden items-center gap-2 text-sm font-bold text-[#5e594f] hover:text-[#ff5738] sm:inline-flex"><ArrowLeft size={17}/> Back</button>
      <header className="mb-8 hidden flex-col justify-between gap-6 border-b border-[#d6cec1] pb-8 sm:flex md:flex-row md:items-end">
        <div><p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-[#ff5738]">{itineraryDay ? "Tour itinerary" : "Live operations / day sheet"}</p>
          <h1 className="text-4xl font-black tracking-[-0.04em] text-[#171713] md:text-6xl">{itineraryDay ? (show.showType === "off_day" ? "Off day" : "Travel day") : displayTitle}</h1>
          {show.festivalName && show.venueName && <p className="mt-2 text-sm font-bold text-[#686258]">{show.venueName}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-3 text-[#686258]"><span>{localDate(show.showDate)}</span><span>·</span><span>{location}</span><span className="rounded-full border border-[#beb6aa] px-3 py-1 text-xs font-bold uppercase">{show.status.replaceAll("_", " ")}</span></p>
        </div>
        <div className="day-sheet-no-print flex flex-wrap gap-2">
          {directionsDestination && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(directionsDestination)}`} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full border border-[#bdb5aa] px-5 font-bold"><Navigation size={17}/> Directions</a>}
          {!externalCollaborator && <button onClick={() => setSharing(true)} className="inline-flex h-12 items-center gap-2 rounded-full border border-[#bdb5aa] px-5 font-bold"><Share2 size={17}/> Share</button>}
          <button onClick={() => window.print()} className="inline-flex h-12 items-center gap-2 rounded-full border border-[#bdb5aa] px-5 font-bold"><Printer size={17}/> Print</button>
          {accessLevel !== "viewer" && <button onClick={openEditor} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ff5738] px-6 font-bold text-white shadow-[0_12px_30px_rgba(255,87,56,.25)] hover:bg-[#ec4325]"><Pencil size={17}/> Edit</button>}
        </div>
      </header>

      {offlineCopy && <div role="status" className="day-sheet-no-print mb-8 hidden items-center justify-between gap-5 rounded-2xl border border-[#e1a06f] bg-[#fff0df] p-5 sm:flex"><div><p className="font-black text-[#6f431f]">Saved copy — not live</p><p className="mt-1 text-sm text-[#795633]">Downloaded {offlineSavedAt ? new Date(offlineSavedAt).toLocaleString() : 'at an unknown time'}. Check for changes when the connection returns.</p></div><button type="button" disabled={!online || refreshingOffline} onClick={refreshOffline} className="min-h-11 shrink-0 rounded-full bg-[#171713] px-5 text-sm font-black text-white disabled:opacity-50">{refreshingOffline ? 'Refreshing…' : 'Refresh now'}</button></div>}

      <nav className="day-sheet-no-print mb-8 hidden grid-cols-3 rounded-2xl border border-[#d8d0c3] bg-[#e8e0d4] p-1 sm:grid" aria-label="Show sheet sections">
        {([['show', 'Show'], ['plan', 'Plan'], ['files', 'Files & admin']] as const).map(([section, label]) => <button key={section} type="button" onClick={() => setActiveSection(section)} aria-current={activeSection === section ? 'page' : undefined} className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${activeSection === section ? 'bg-[#171713] text-white shadow-sm' : 'text-[#686258] hover:bg-white/50 hover:text-[#171713]'}`}>{label}</button>)}
      </nav>

      {activeSection === 'show' && <>
      {!offlineCopy && <div className="mb-8"><DaySheetDisclosure eyebrow="Latest information" title="Updates & alerts" summary={updatesNeedAttention ? "Action required — review the alert below." : "Open to review notices and changes since your last visit."} forceOpen={updatesNeedAttention}><ShowUpdates showId={showId} onAttentionChange={setUpdatesNeedAttention} /></DaySheetDisclosure></div>}

      {!itineraryDay && (missing.length > 0 || timingIssues.length > 0) && <section className="mb-8 hidden rounded-3xl border border-[#ff9d8c] bg-[#fff1ec] p-6 sm:block">
        <div className="flex items-start gap-4"><CircleAlert className="mt-1 text-[#ff5738]"/><div><p className="text-lg font-black">This day sheet needs attention</p>{missing.length > 0 && <p className="mt-1 text-sm text-[#686258]">Missing: {missing.join(", ")}.</p>}{timingIssues.length > 0 && <p className="mt-1 text-sm font-semibold text-[#b63822]">Schedule: {timingIssues.join("; ")}.</p>}</div></div>
      </section>}

      <div className="hidden gap-6 sm:grid xl:grid-cols-[1.45fr_.8fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-[#d8d0c3] bg-[#fffaf2] p-7 shadow-[0_18px_50px_rgba(45,37,24,.08)]"><div className="mb-5 flex items-center gap-3"><Clock3 className="text-[#ff5738]"/><h2 className="text-2xl font-black">{itineraryDay ? "Itinerary" : "Run of show"}</h2></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5">{[["Load-in", show.loadInTime], ["Soundcheck", show.soundCheckTime], ["Doors", show.doorsTime], ["On stage", show.showTime], ["Finish", show.endTime]].map(([label, value]) => <div key={label} className="border-t border-[#d8d0c3] py-5 sm:border-l sm:border-t-0 sm:px-5 first:border-l-0 first:pl-0"><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#777267]">{label}</p><p className={`mt-2 text-2xl font-black ${value ? "text-[#171713]" : "text-[#aaa397]"}`}>{time(value)}</p></div>)}</div>
          </section>
          <section className="rounded-3xl border border-[#d8d0c3] bg-[#fffaf2] p-7"><div className="mb-4 flex items-center gap-3"><MapPin className="text-[#ff5738]"/><h2 className="text-2xl font-black">Location</h2></div><div className="grid gap-x-10 md:grid-cols-2">{show.festivalName && <Field label="Festival / event" value={show.festivalName}/>}<Field label="Venue" value={show.venueName}/><Field label="Address" value={show.venueAddress}/><Field label="City / region / country" value={location}/><Field label="Capacity" value={show.venueCapacity?.toLocaleString()}/></div></section>
          <section className="rounded-3xl border border-[#d8d0c3] bg-[#fffaf2] p-7"><div className="mb-4 flex items-center gap-3"><Contact className="text-[#ff5738]"/><h2 className="text-2xl font-black">Promoter & venue contact</h2></div><div className="grid gap-x-10 md:grid-cols-3"><Field label="Name" value={show.contactName}/><div><Field label="Email" value={show.contactEmail}/>{show.contactEmail && <a className="day-sheet-no-print -mt-3 mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#e54525]" href={`mailto:${show.contactEmail}`}><Mail size={15}/> Email contact</a>}</div><div><Field label="Phone" value={show.contactPhone}/>{show.contactPhone && <a className="day-sheet-no-print -mt-3 mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#e54525]" href={`tel:${show.contactPhone}`}><Phone size={15}/> Call contact</a>}</div></div></section>
        </div>
        <aside className="space-y-6">{financialVisible && <section className="rounded-3xl bg-[#171713] p-7 text-white"><div className="mb-4 flex items-center gap-3"><ReceiptText className="text-[#ff5738]"/><h2 className="text-2xl font-black">Commercials</h2></div><Field inverse label="Guarantee" value={money(show.guarantee, show.currency)} accent/><Field inverse label="Deal" value={show.dealType?.replaceAll("_", " ")}/><Field inverse label="Ticket price" value={money(show.ticketPrice, show.currency)}/><Field inverse label="Payment" value={show.isPaid ? "Paid" : "Not marked paid"}/></section>}
          <section className="rounded-3xl border border-[#d8d0c3] bg-[#e2dbcf] p-7"><div className="mb-4 flex items-center gap-3"><FileText/><h2 className="text-2xl font-black">Notes</h2></div><p className="whitespace-pre-wrap leading-7 text-[#4f4b43]">{show.notes || "No notes have been added for this date."}</p></section></aside>
      </div>
      </>}

      {activeSection === 'plan' && <div>
        {!offlineCopy && !itineraryDay && <div id="day-sheet-advance" className="mb-8 scroll-mt-24"><AdvanceChecklist showId={showId} canEdit={accessLevel !== "viewer"} canDelete={['owner', 'admin'].includes(accessLevel)} /></div>}
        {!offlineCopy && <div className="mb-8"><DaySheetDisclosure eyebrow="Daily operations" title="Schedule & travel" summary="Travel, calls, accommodation and the run of show in chronological order."><DailyItinerary showId={showId} canEdit={accessLevel !== "viewer"} /></DaySheetDisclosure></div>}
        {!offlineCopy && <div className="mb-8"><DaySheetDisclosure eyebrow="On the road" title="Flights & accommodation" summary="Inbound travel, flight booking and the overnight plan."><TravelAccommodation showId={showId} canEdit={accessLevel !== "viewer"} financialAccess={financialEditable ? "edit" : financialVisible ? "view" : "hidden"} /></DaySheetDisclosure></div>}
        {!offlineCopy && !externalCollaborator && <div className="mb-8"><DaySheetDisclosure id="day-sheet-guests" eyebrow="Guest list and passes" title="Guest list" summary="Guest requests, approvals, allowances and door exports."><GuestList showId={showId} canEdit={accessLevel !== "viewer"} canDelete={['owner', 'admin'].includes(accessLevel)} /></DaySheetDisclosure></div>}
      </div>}

      {activeSection === 'files' && <div>
        {!offlineCopy && <div className="mb-8"><DaySheetDisclosure id="day-sheet-documents" eyebrow="Show files" title="Documents" summary="Riders, confirmations, travel documents and acknowledgements."><DocumentVault showId={showId} canEdit={accessLevel !== "viewer"} financialAccess={financialEditable ? "edit" : financialVisible ? "view" : "hidden"} /></DaySheetDisclosure></div>}
        {!offlineCopy && !externalCollaborator && <div className="mb-8"><DaySheetDisclosure eyebrow="Repeatable schedules" title="Templates and time tools" summary="Apply a template, copy another date or save this schedule."><ScheduleTemplates showId={showId} canEdit={accessLevel !== "viewer"} canManageTemplates={['owner', 'admin'].includes(accessLevel)} onChanged={() => void loadShow()} /></DaySheetDisclosure></div>}
        <DaySheetDisclosure eyebrow="History" title="Activity & approvals" summary="A permanent record of changes and pending approvals."><DaySheetActivity showId={showId} onChanged={() => void loadShow()}/></DaySheetDisclosure>
      </div>}
    </div>

    {editing && <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="day-sheet-editor-title"><div ref={editorRef} className="mx-auto flex min-h-[100dvh] max-w-4xl flex-col bg-[#f7f0e5] shadow-2xl sm:my-8 sm:min-h-0 sm:rounded-3xl">
      <div className="mobile-safe-top sticky top-0 z-20 flex items-center justify-between border-b border-[#d8d0c3] bg-[#f7f0e5]/95 px-4 py-3 backdrop-blur-xl sm:static sm:rounded-t-3xl sm:px-8 sm:pt-8"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#ff5738]">Advance the show</p><h2 id="day-sheet-editor-title" className="mt-1 text-2xl font-black sm:text-3xl">Edit day sheet</h2>{draftSavedAt && <p className="mt-1 text-xs font-semibold text-[#716b61]">Draft saved on this device</p>}</div><button onClick={() => setEditing(false)} className="grid min-h-12 min-w-12 place-items-center rounded-full hover:bg-black/10" aria-label="Close and keep draft"><X/></button></div>
      <div className="flex-1 space-y-4 px-4 py-5 sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0 sm:px-8 sm:py-8">
        <EditorSection title="Show"><Input label="Show date" type="date" value={form.showDate} onChange={(v) => update("showDate", v)}/><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">Status</span><select value={form.status} onChange={(e) => update("status", e.target.value as Show["status"])} className="h-12 w-full rounded-xl border border-[#d7cfc2] bg-white px-3 text-base sm:h-11 sm:text-sm"><option value="draft">Draft</option><option value="pending_invite">Pending invite</option><option value="pending_acceptance">Pending acceptance</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option></select></label></EditorSection>
        <EditorSection title="Venue">
          <Input label="Festival / event name (optional)" value={form.festivalName} onChange={(v) => update("festivalName", v)}/>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#625e55]">Venue name</span>
            <VenueDirectoryAutocomplete
              value={form.venueName}
              onChange={changeVenueQuery}
              onPlaceSelect={selectGoogleVenue}
              onStoredVenueSelect={selectStoredVenue}
              city={form.venueCity}
              country={form.venueCountry}
              placeholder="Start typing a venue, then choose a result…"
              className="h-12 w-full rounded-xl border border-[#d7cfc2] bg-white px-3 text-base text-[#171713] outline-none transition focus:border-[#ff5738] focus:ring-2 focus:ring-[#ff5738]/15 sm:h-11 sm:text-sm"
            />
            <span className="mt-1.5 block text-xs text-[#777267]">Choose a SceneGen or Google result to fill the address automatically. SceneGen can show up to 50 saved matches; add a city or region to refine Google&apos;s live suggestions.</span>
          </label>
          <Input label="Venue address" value={form.venueAddress} onChange={(v) => update("venueAddress", v)}/>
          <Input label="City" value={form.venueCity} onChange={(v) => update("venueCity", v)}/>
          <Input label="Region / state" value={form.venueState} onChange={(v) => update("venueState", v)}/>
          <Input label="Country" value={form.venueCountry} onChange={(v) => update("venueCountry", v)}/>
          <Input label="Capacity" type="number" value={form.venueCapacity} onChange={(v) => update("venueCapacity", v ? Number(v) : undefined)}/>
        </EditorSection>
        <EditorSection title="Run of show"><Input label="Load-in" type="time" value={form.loadInTime} onChange={(v) => update("loadInTime", v)}/><Input label="Soundcheck" type="time" value={form.soundCheckTime} onChange={(v) => update("soundCheckTime", v)}/><Input label="Doors" type="time" value={form.doorsTime} onChange={(v) => update("doorsTime", v)}/><Input label="On stage" type="time" value={form.showTime} onChange={(v) => update("showTime", v)}/><Input label="Finish" type="time" value={form.endTime} onChange={(v) => update("endTime", v)}/></EditorSection>
        <EditorSection title="Contact"><Input label="Promoter / contact" value={form.contactName} onChange={(v) => update("contactName", v)}/><Input label="Contact email" type="email" value={form.contactEmail} onChange={(v) => update("contactEmail", v)}/><Input label="Contact phone" type="tel" value={form.contactPhone} onChange={(v) => update("contactPhone", v)}/></EditorSection>
        {financialEditable && <EditorSection title="Commercials"><Input label="Guarantee" type="number" value={form.guarantee} onChange={(v) => update("guarantee", v ? Number(v) : undefined)}/><Input label="Currency" value={form.currency} onChange={(v) => update("currency", v.toUpperCase())}/><Input label="Ticket price" type="number" value={form.ticketPrice} onChange={(v) => update("ticketPrice", v ? Number(v) : undefined)}/><label className="flex min-h-12 items-center gap-3 font-semibold"><input type="checkbox" checked={Boolean(form.isPaid)} onChange={(e) => update("isPaid", e.target.checked)} className="h-6 w-6 accent-[#ff5738]"/> Payment received</label></EditorSection>}
        <fieldset className="rounded-[22px] border border-[#ddd4c7] bg-[#fffaf2] p-4 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"><legend className="mb-4 w-full text-[11px] font-black uppercase tracking-[.18em] text-[#e74829]">Notes</legend><textarea value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} rows={6} className="w-full rounded-xl border border-[#d7cfc2] bg-white p-3 text-base outline-none focus:border-[#ff5738] sm:text-sm"/></fieldset>
        {formTimingIssues.length > 0 && <div className="rounded-2xl border border-[#ff9d8c] bg-[#fff1ec] p-4 text-sm font-semibold text-[#a73220] sm:col-span-2"><CircleAlert className="mr-2 inline" size={17}/> {formTimingIssues.join("; ")}. Correct the schedule to save.</div>}
      </div>
      <div className="mobile-safe-bottom sticky bottom-0 z-20 grid grid-cols-[auto_1fr] gap-3 border-t border-[#d8d0c3] bg-[#f7f0e5]/95 px-4 py-3 backdrop-blur-xl sm:static sm:flex sm:justify-end sm:rounded-b-3xl sm:px-8 sm:pb-8"><button onClick={discardDraft} className="min-h-12 rounded-full border border-[#bdb5aa] px-5 font-bold">Discard</button>{online ? <button disabled={saving || formTimingIssues.length > 0} onClick={save} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ff5738] px-6 font-bold text-white disabled:opacity-50"><Save size={17}/>{saving ? "Saving…" : "Save changes"}</button> : <button disabled className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#ff5738] px-6 font-bold text-white opacity-50">Waiting for connection</button>}</div>
    </div></div>}
    {entityId && <ShareShowModal isOpen={sharing} onClose={() => setSharing(false)} showId={showId} showName={`${displayTitle} — ${localDate(show.showDate)}`} entityId={entityId}/>}
  </main>;
}
