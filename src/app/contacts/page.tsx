"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { BarChart3, ChevronDown, Compass, List, Map as MapIcon, Search, SlidersHorizontal, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useOnboardingRedirect } from "@/hooks/useOnboardingRedirect";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { useProfileStore } from "@/store/useProfileStore";
import { ContactCardSkeleton, ListSkeleton } from "@/components/ui/skeleton";
import ContactsTable from "@/components/contacts/ContactsTable";
import { contactMapPoints, contactPlaces, contactTags } from "@/lib/contactDirectory";

const ContactMap = dynamic(() => import("@/components/contacts/ContactMap"), {
  ssr: false,
  loading: () => <div className="h-[32rem] animate-pulse rounded-lg bg-[#e5ddd1]" />,
});
const ContactIntelligenceMap = dynamic(() => import("@/components/contacts/ContactIntelligenceMap"), { ssr: false, loading: () => <div className="h-[36rem] animate-pulse rounded-lg bg-[#e5ddd1]" /> });

type TabType = "accepted" | "pending";
type ViewType = "list" | "map" | "intelligence";

const displayLabel = (value?: string) => value?.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()) || "Unspecified";
const unique = (values: Array<string | undefined>) => Array.from(values.reduce((items, value) => {
  const cleaned = value?.trim();
  if (cleaned && !items.has(cleaned.toLowerCase())) items.set(cleaned.toLowerCase(), cleaned);
  return items;
}, new Map<string, string>()).values()).sort((left, right) => left.localeCompare(right));

export default function Contacts() {
  const { data: session } = useSession();
  const { isChecking: isCheckingEntities } = useOnboardingRedirect();
  const { activeProfile } = useProfileStore();
  const { fetchContacts, acceptContact, rejectContact, isLoading, error } = useContacts();
  const [activeTab, setActiveTab] = useState<TabType>("accepted");
  const [view, setView] = useState<ViewType>("list");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [genre, setGenre] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null);
  const [decidingContactId, setDecidingContactId] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadContacts = useCallback(async (tab: TabType) => {
    const requestId = ++requestSequence.current;
    setIsLoadingContacts(true);
    try {
      const data = await fetchContacts(tab);
      if (requestId === requestSequence.current) setContacts(data);
    } catch (caught) {
      if (requestId === requestSequence.current) {
        console.error("Failed to fetch contacts:", caught);
        toast.error("Failed to load contacts. Please try again.");
      }
    } finally {
      if (requestId === requestSequence.current) setIsLoadingContacts(false);
    }
  }, [fetchContacts]);

  useEffect(() => {
    if (session?.user?.id) {
      void loadContacts(activeTab);
    }
  }, [activeProfile?.id, activeTab, loadContacts, session?.user?.id]);

  const incomingRequests = contacts.filter((contact) => contact.status === "pending" && contact.requestedBy !== activeProfile?.id);
  const outgoingRequests = contacts.filter((contact) => contact.status === "pending" && contact.requestedBy === activeProfile?.id);
  const roleNames = new Set(['artist','promoter','venue','booking agent','agent','tour manager','manager','crew','crew member','production manager','sound engineer','lighting engineer','photographer','press','publicist','label','festival','organisation','organization']);
  const isRole = (value?: string) => Boolean(value && roleNames.has(value.trim().toLowerCase()));
  const roles = useMemo(() => unique(contacts.flatMap((contact) => [
    contact.contactJobTitle, contact.contactType,
    ...(Array.isArray(contact.contactRoles) ? contact.contactRoles : []),
  ].filter(isRole))), [contacts]);
  const countries = useMemo(() => unique(contacts.flatMap((contact) => contactPlaces(contact).map((place) => place.country))), [contacts]);
  const cities = useMemo(() => unique(contacts.flatMap((contact) => contactPlaces(contact)
    .filter((place) => !country || place.country.toLocaleLowerCase() === country.toLocaleLowerCase())
    .map((place) => place.city))), [contacts, country]);
  const genres = useMemo(() => unique(contacts.flatMap(contactTags)), [contacts]);
  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contacts.filter((contact) => {
      const tags = contactTags(contact);
      const locations = contactPlaces(contact);
      const contactRoles = Array.isArray(contact.contactRoles) ? contact.contactRoles : [];
      const territories = Array.isArray(contact.contactTerritories) ? contact.contactTerritories : [];
      const roleNeedle = role.toLowerCase();
      const searchable = [contact.contactName, contact.contactType, contact.contactOrganization,
        contact.contactJobTitle, contact.contactEmail, contact.contactPhone, contact.contactCity,
        contact.contactState, contact.contactCountry,
        ...locations.flatMap((place) => [place.city, place.state, place.country]),
        ...contactRoles, ...territories, ...tags]
        .filter(Boolean).join(" ").toLowerCase();
      return (!needle || searchable.includes(needle))
        && (!role || [contact.contactType, contact.contactJobTitle, ...contactRoles]
          .some((value) => value?.toLowerCase() === roleNeedle))
        && ((!country && !city) || locations.some((place) =>
          (!country || place.country.toLocaleLowerCase() === country.toLocaleLowerCase())
          && (!city || place.city.toLocaleLowerCase() === city.toLocaleLowerCase())))
        && (!genre || tags.includes(genre));
    });
  }, [contacts, query, role, country, city, genre]);
  const hasFilters = Boolean(query || role || country || city || genre);
  const mappedCount = filteredContacts.filter((contact) => contactMapPoints(contact).length > 0).length;

  function clearFilters() {
    setQuery(""); setRole(""); setCountry(""); setCity(""); setGenre(""); setFocusedContactId(null);
  }

  function selectTab(tab: TabType) {
    if (tab === activeTab) return;
    setContacts([]);
    setActiveTab(tab);
    setView("list");
    clearFilters();
  }

  function showOnMap(contact: Contact) {
    setFocusedContactId(contact.id);
    setView("map");
  }

  async function decide(contactId: string, decision: "accept" | "reject") {
    if (decidingContactId) return;
    setDecidingContactId(contactId);
    try {
      if (decision === "accept") await acceptContact(contactId);
      else await rejectContact(contactId);
      toast.success(decision === "accept" ? "Contact request accepted" : "Contact request declined");
      await loadContacts("pending");
    } catch (caught) {
      console.error(`Failed to ${decision} contact:`, caught);
      toast.error(`Failed to ${decision} contact request. Please try again.`);
    } finally {
      setDecidingContactId(null);
    }
  }

  if (isCheckingEntities) return <div className="scene-page"><h2 className="text-2xl font-bold">Loading...</h2></div>;

  return <div className="scene-page min-h-[calc(100dvh-5rem)] overflow-y-auto pb-28 md:h-[calc(100vh-5rem)] md:pb-8">
    <header className="flex flex-col gap-5 border-b border-black/10 pb-6 sm:pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="scene-kicker">Working network</p><h1 className="scene-title">Contacts</h1><p className="scene-copy">Find the people and organisations that move the work forward.</p></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#171713] bg-[#fffaf2] px-6 text-sm font-bold text-[#171713] transition hover:bg-[#e9e1d5] sm:w-fit" href="/contacts/discover"><Compass size={17} />Discover promoters</Link>
        <Link className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff5a36] px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,90,54,.2)] transition hover:bg-[#e54525] sm:w-fit" href="/contacts/add"><UserPlus size={17} />Add contact</Link>
      </div>
    </header>

    <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-3">
      <div className="rounded-xl border border-black/10 bg-[#fffaf2] p-4 sm:rounded-lg sm:p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#777168]">Connected</p><p className="mt-2 text-3xl font-black">{activeTab === "accepted" ? contacts.length : "-"}</p></div>
      <div className="hidden rounded-lg border border-black/10 bg-[#fffaf2] p-5 sm:block"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#777168]">Countries represented</p><p className="mt-2 text-3xl font-black">{activeTab === "accepted" ? countries.length : "-"}</p></div>
      <button type="button" onClick={() => selectTab("pending")} className="min-h-24 rounded-xl border border-black/10 bg-[#171713] p-4 text-left text-white sm:rounded-lg sm:p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-white/50">Contact requests</p><p className="mt-2 text-base font-black text-[#ff7356] sm:text-xl">Review requests</p></button>
    </div>

    <div className="mt-8 flex gap-8 border-b border-black/10" role="tablist" aria-label="Contact sections">
      {([["accepted", "My contacts"], ["pending", "Pending requests"]] as const).map(([value, text]) => <button key={value} type="button" role="tab" aria-selected={activeTab === value} onClick={() => selectTab(value)} className={`relative px-2 pb-4 font-bold ${activeTab === value ? "text-[#f04e30]" : "text-[#6d685f] hover:text-[#171713]"}`}>{text}{activeTab === value && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f04e30]" />}</button>)}
    </div>

    {activeTab === "accepted" ? <section className="mt-6">
      <div className="rounded-xl border border-black/10 bg-[#fffaf2] p-3 shadow-sm sm:rounded-lg sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search contacts</span><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777168]" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, roles, places or tags" className="h-12 w-full rounded-md border border-black/10 bg-white pl-11 pr-4 outline-none focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36]/15" /></label>
          <button type="button" onClick={() => setShowMobileFilters((open) => !open)} aria-expanded={showMobileFilters} className="flex min-h-12 items-center justify-between rounded-md border border-black/10 bg-white px-4 text-sm font-bold sm:hidden"><span className="flex items-center gap-2"><SlidersHorizontal size={17} />Filters{hasFilters ? " applied" : ""}</span><ChevronDown size={18} className={`transition ${showMobileFilters ? "rotate-180" : ""}`} /></button>
          <div className={`${showMobileFilters ? "grid" : "hidden"} grid-cols-2 gap-2 sm:flex sm:flex-wrap`}>
            <FilterSelect label="Role" allLabel="All roles" value={role} values={roles} onChange={setRole} />
            <FilterSelect label="Country" allLabel="All countries" value={country} values={countries} onChange={(value) => { setCountry(value); setCity(""); }} />
            <FilterSelect label="City" allLabel="All cities" value={city} values={cities} onChange={setCity} />
            <FilterSelect label="Genre or tag" allLabel="All genres and tags" value={genre} values={genres} onChange={setGenre} />
            {hasFilters && <button type="button" onClick={clearFilters} className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-[#6d685f] hover:bg-[#eee6da] sm:col-auto"><X size={16} />Clear</button>}
          </div>
          <div className="grid min-h-12 grid-cols-3 rounded-md bg-[#eee6da] p-1 xl:flex" aria-label="Contact view">
            <button type="button" onClick={() => setView("list")} aria-label="List view" aria-pressed={view === "list"} className={`flex min-h-11 items-center justify-center gap-2 rounded px-4 text-sm font-bold ${view === "list" ? "bg-[#171713] text-white" : "text-[#6d685f]"}`}><List size={18} /><span>List</span></button>
            <button type="button" onClick={() => { setFocusedContactId(null); setView("map"); }} aria-label="Contact map" aria-pressed={view === "map"} className={`flex min-h-11 items-center justify-center gap-2 rounded px-4 text-sm font-bold ${view === "map" ? "bg-[#171713] text-white" : "text-[#6d685f]"}`}><MapIcon size={18} /><span>Contact map</span></button>
            <button type="button" onClick={() => setView("intelligence")} aria-label="Insights" aria-pressed={view === "intelligence"} className={`flex min-h-11 items-center justify-center gap-2 rounded px-4 text-sm font-bold ${view === "intelligence" ? "bg-[#171713] text-white" : "text-[#6d685f]"}`}><BarChart3 size={18} /><span>Insights</span></button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-[#6d685f]"><p><strong className="text-[#171713]">{filteredContacts.length}</strong> {filteredContacts.length === 1 ? "contact" : "contacts"}{hasFilters ? " matching these filters" : ""}</p>{view === "map" && <p>{mappedCount} shown on map</p>}</div>

      {isLoadingContacts ? <div className="mt-5"><ListSkeleton count={4} ItemSkeleton={ContactCardSkeleton} /></div>
        : contacts.length === 0 ? <EmptyContacts />
        : filteredContacts.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-black/15 bg-[#fffaf2] px-6 py-16 text-center"><SlidersHorizontal className="mx-auto text-[#ff5a36]" /><h2 className="mt-4 text-2xl font-black">No contacts match</h2><p className="mt-2 text-sm text-[#6d685f]">Try a broader search or clear the filters.</p><button type="button" onClick={clearFilters} className="mt-5 rounded-full bg-[#171713] px-5 py-3 text-sm font-bold text-white">Clear filters</button></div>
        : view === "list" ? <ContactsTable contacts={filteredContacts} onShowMap={showOnMap} onContactUpdated={() => loadContacts("accepted")} />
        : view === "map" ? <div className="mt-5 space-y-3">{focusedContactId && <div className="flex items-center justify-between rounded-lg border border-black/10 bg-[#fffaf2] p-3"><strong className="text-sm">Showing: {filteredContacts.find(contact => contact.id === focusedContactId)?.contactName || "Selected contact"}</strong><button type="button" className="rounded-full border border-black/15 px-3 py-2 text-sm font-bold" onClick={() => setFocusedContactId(null)}>Show all contacts</button></div>}<ContactMap contacts={focusedContactId ? filteredContacts.filter(contact => contact.id === focusedContactId) : filteredContacts} focusContactId={focusedContactId} /></div>
        : <div className="mt-5"><ContactIntelligenceMap /></div>}
    </section> : <section className="mt-8 space-y-8">
      <RequestGroup title="Incoming requests" empty="No incoming contact requests" contacts={incomingRequests} loading={isLoadingContacts} actions onDecision={decide} busy={isLoading} decidingContactId={decidingContactId} />
      <RequestGroup title="Outgoing requests" empty="No outgoing contact requests" contacts={outgoingRequests} loading={isLoadingContacts} />
    </section>}

    {error && <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-4 text-red-700">{error}</div>}
  </div>;
}

function FilterSelect({ label, allLabel, value, values, onChange }: { label: string; allLabel: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label className="min-w-0"><span className="sr-only">Filter by {label}</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={values.length === 0} className="h-12 w-full min-w-0 rounded-md border border-black/10 bg-white px-3 text-base outline-none focus:border-[#ff5a36] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:text-sm"><option value="">{allLabel}</option>{values.map((item) => <option value={item} key={item}>{displayLabel(item)}</option>)}</select></label>;
}

function EmptyContacts() {
  return <div className="mt-5 rounded-lg border border-dashed border-black/15 bg-[#fffaf2] px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-[#ff5a36]/10 text-[#ff5a36]"><Users /></div><h2 className="mt-5 text-2xl font-black">Build your working network</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#6d685f]">Add anyone you work with, import show contacts, or connect to an existing SceneGen profile.</p><Link href="/contacts/add" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ff5a36] px-5 py-3 text-sm font-bold text-white"><UserPlus size={16} />Add a contact</Link></div>;
}

function RequestGroup({ title, empty, contacts, loading, actions = false, onDecision, busy = false, decidingContactId }: { title: string; empty: string; contacts: Contact[]; loading: boolean; actions?: boolean; onDecision?: (id: string, decision: "accept" | "reject") => void; busy?: boolean; decidingContactId?: string | null }) {
  return <div><h2 className="mb-4 text-xl font-black">{title} <span className="text-[#777168]">({contacts.length})</span></h2>{loading ? <ListSkeleton count={2} ItemSkeleton={ContactCardSkeleton} /> : contacts.length === 0 ? <div className="rounded-lg border border-dashed border-black/15 bg-[#fffaf2] py-10 text-center text-sm text-[#6d685f]">{empty}</div> : <div className="grid gap-3">{contacts.map((contact) => <article key={contact.id} className="flex flex-col justify-between gap-4 rounded-xl border border-black/10 bg-[#fffaf2] p-5 sm:flex-row sm:items-center"><div><p className="font-black">{contact.contactName || "Contact request"}</p><p className="mt-1 text-sm text-[#6d685f]">{[displayLabel(contact.contactType), contact.contactCity, contact.contactCountry].filter(Boolean).join(" · ")}</p>{contact.message && <p className="mt-2 text-sm text-[#4f4a43]">{contact.message}</p>}<p className="mt-2 text-xs text-[#8a847a]">{actions ? "Received" : "Sent"} {new Date(contact.createdAt).toLocaleDateString()}</p></div>{actions ? <div className="grid grid-cols-2 gap-2 sm:flex"><button type="button" disabled={busy || Boolean(decidingContactId)} onClick={() => onDecision?.(contact.id, "reject")} className="min-h-12 rounded-full border border-black/15 px-4 py-2 text-sm font-bold disabled:opacity-50">Decline</button><button type="button" disabled={busy || Boolean(decidingContactId)} onClick={() => onDecision?.(contact.id, "accept")} className="min-h-12 rounded-full bg-[#171713] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{decidingContactId === contact.id ? "Working..." : "Accept"}</button></div> : <span className="w-fit rounded-full bg-[#eee6da] px-3 py-1 text-xs font-bold text-[#6d685f]">Awaiting response</span>}</article>)}</div>}</div>;
}
