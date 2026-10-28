'use client';

import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileUp, Search, UserRoundPlus, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import ContactSearch from '@/components/contacts/ContactSearch';
import PromoterDiscovery from '@/components/contacts/PromoterDiscovery';
import { getEntityId } from '@/lib/entity';
import { contactsFromCsv } from '@/lib/contactCsv';
import ContactLocationPicker, { type ContactLocation } from '@/components/contacts/ContactLocationPicker';

type Tab = 'private' | 'scenegen' | 'import' | 'discover';
const blank = { kind: 'person', displayName: '', givenName: '', surname: '', organization: '', jobTitle: '',
  email: '', phone: '', preferredContactMethod: '', roles: '', territories: '', city: '', region: '', country: '',
  latitude: null as number | null, longitude: null as number | null, tags: '', notes: '' };
const split = (value: string) => value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
const inputClass = 'h-12 w-full rounded-md border border-black/10 bg-white px-4 text-base outline-none focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36]/15 sm:text-sm';

export default function AddContactPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('private');
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [locationPending, setLocationPending] = useState(false);
  const set = (key: keyof typeof blank, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const setLocation = useCallback((location: ContactLocation) => setForm((current) => ({ ...current, ...location })), []);
  const headers = () => {
    const entityId = getEntityId();
    return { 'Content-Type': 'application/json', ...(entityId ? { 'X-Entity-Id': entityId } : {}) };
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (locationPending) return toast.error('Choose a Google location suggestion before saving');
    setBusy(true);
    try {
      const response = await fetch('/api/contacts/private', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ ...form, roles: split(form.roles), territories: split(form.territories), tags: split(form.tags) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || body.error || 'Could not save contact');
      toast.success(`${form.displayName} added to your contacts`);
      router.push('/contacts');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not save contact');
    } finally { setBusy(false); }
  }

  async function importShows() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/contacts/private/import-shows', { method: 'POST', headers: headers() });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Import failed');
      toast.success(`${body.imported} show ${body.imported === 1 ? 'contact' : 'contacts'} imported${body.skipped ? `, ${body.skipped} skipped` : ''}`);
      router.push('/contacts');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Import failed');
    } finally { setBusy(false); }
  }

  async function importCsv(file?: File) {
    if (!file || busy) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Choose a CSV file no larger than 2 MB');
    setBusy(true);
    try {
      const contacts = contactsFromCsv(await file.text());
      const response = await fetch('/api/contacts/private', {
        method: 'POST', headers: headers(), body: JSON.stringify({ contacts }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'CSV import failed');
      toast.success(`${contacts.length} contacts imported`);
      router.push('/contacts');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'CSV import failed');
    } finally { setBusy(false); }
  }

  return <div className="scene-page min-h-[calc(100dvh-5rem)] overflow-y-auto pb-28 md:h-[calc(100vh-5rem)] md:pb-8"><Link href="/contacts" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#6d685f] hover:text-[#171713]"><ArrowLeft size={16} />Back to contacts</Link>
    <header className="mt-5 border-b border-black/10 pb-8"><p className="scene-kicker">Working network</p><h1 className="scene-title">Add a contact</h1><p className="scene-copy">Keep your professional network together, including people who are not on SceneGen.</p></header>
    <nav className="mt-7 grid max-w-4xl grid-cols-2 gap-1 sm:grid-cols-4 rounded-lg bg-[#e9e1d5] p-1" aria-label="Contact source">{([['private', 'Create privately', UserRoundPlus], ['scenegen', 'Find on SceneGen', Search], ['discover', 'Discover promoters', Search], ['import', 'Import contacts', FileUp]] as const).map(([value, label, Icon]) => <button type="button" key={value} onClick={() => setTab(value)} aria-pressed={tab === value} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-black leading-tight sm:min-h-12 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${tab === value ? 'bg-[#171713] text-white' : 'text-[#686258] hover:bg-white/60'}`}><Icon size={17} />{label}</button>)}</nav>
    <section className="mt-5 max-w-4xl rounded-xl border border-black/10 bg-[#fffaf2] p-4 shadow-sm sm:p-6 md:p-8">
      {tab === 'private' && <form onSubmit={save} className="space-y-7"><Intro title="Private address-book contact" copy="Only your workspace can see this record. You can link it to a verified SceneGen profile later." />
        <div className="grid gap-4 md:grid-cols-2"><Field label="Contact type"><select value={form.kind} onChange={(event) => set('kind', event.target.value)} className={inputClass}><option value="person">Person</option><option value="organization">Organisation</option></select></Field><Field label="Display name" required><input required maxLength={200} value={form.displayName} onChange={(event) => set('displayName', event.target.value)} className={inputClass} placeholder="Alex Smith or Northstar Agency" /></Field></div>
        <div className="grid gap-4 md:grid-cols-2">{([['Given name', 'givenName'], ['Surname', 'surname'], ['Organisation', 'organization'], ['Job title', 'jobTitle']] as const).map(([label, key]) => <Field key={key} label={label}><input value={form[key]} onChange={(event) => set(key, event.target.value)} className={inputClass} /></Field>)}</div>
        <div className="grid gap-4 md:grid-cols-2"><Field label="Email"><input type="email" maxLength={254} value={form.email} onChange={(event) => set('email', event.target.value)} className={inputClass} /></Field><Field label="Phone"><input type="tel" maxLength={80} value={form.phone} onChange={(event) => set('phone', event.target.value)} className={inputClass} /></Field><Field label="Preferred contact method"><select value={form.preferredContactMethod} onChange={(event) => set('preferredContactMethod', event.target.value)} className={inputClass}><option value="">Not specified</option><option value="email">Email</option><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="other">Other</option></select></Field><Field label="Roles"><input value={form.roles} onChange={(event) => set('roles', event.target.value)} className={inputClass} placeholder="Agent, promoter, tour manager" /></Field></div>
        <ContactLocationPicker location={{ city: form.city, region: form.region, country: form.country, latitude: form.latitude, longitude: form.longitude }} onChange={setLocation} onPendingChange={setLocationPending} />
        <Field label="Territories"><input value={form.territories} onChange={(event) => set('territories', event.target.value)} className={inputClass} placeholder="UK, Benelux" /></Field><Field label="Tags"><input value={form.tags} onChange={(event) => set('tags', event.target.value)} className={inputClass} placeholder="Rock, trusted, festival buyer" /></Field><Field label="Notes"><textarea maxLength={10000} value={form.notes} onChange={(event) => set('notes', event.target.value)} className={`${inputClass} min-h-28 py-3`} /></Field>
        <div className="mobile-safe-bottom sticky bottom-0 z-20 -mx-4 border-t border-black/10 bg-[#fffaf2]/95 p-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0"><button disabled={busy || locationPending || !form.displayName.trim()} className="min-h-12 w-full rounded-full bg-[#ff5a36] px-6 py-3 text-sm font-black text-white disabled:opacity-50 sm:w-auto">{busy ? 'Saving...' : 'Save contact'}</button></div>
      </form>}
      {tab === 'scenegen' && <ContactSearch />}
      {tab === 'discover' && <PromoterDiscovery />}
      {tab === 'import' && <div><Intro title="Bring in existing contacts" copy="Create private records from show promoter details or upload a CSV export from another address book." /><div className="mt-7 grid gap-4 md:grid-cols-2"><button type="button" disabled={busy} onClick={() => void importShows()} className="rounded-lg border border-black/10 bg-white p-6 text-left hover:border-[#ff5a36] disabled:opacity-50"><WandSparkles className="text-[#ff5a36]" /><strong className="mt-4 block">Import from shows</strong><span className="mt-1 block text-sm text-[#6d685f]">Deduplicates promoters already saved.</span></button><label className="cursor-pointer rounded-lg border border-dashed border-black/20 bg-white p-6 hover:border-[#ff5a36]"><FileUp className="text-[#ff5a36]" /><strong className="mt-4 block">Upload CSV</strong><span className="mt-1 block text-sm text-[#6d685f]">Name, email, phone, roles, organisation, city, country and tags. Maximum 500 rows.</span><input type="file" accept=".csv,text/csv" className="sr-only" disabled={busy} onChange={(event) => void importCsv(event.target.files?.[0])} /></label></div></div>}
    </section>
  </div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-[#777168]">{label}{required && ' *'}</span>{children}</label>;
}

function Intro({ title, copy }: { title: string; copy: string }) {
  return <div><h2 className="text-2xl font-black">{title}</h2><p className="mt-1 text-sm text-[#6d685f]">{copy}</p></div>;
}
