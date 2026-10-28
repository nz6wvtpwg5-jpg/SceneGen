'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { Contact } from '@/hooks/useContacts';
import { getEntityId } from '@/lib/entity';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ContactLocationPicker, { type ContactLocation } from './ContactLocationPicker';

const inputClass = 'h-12 w-full rounded-md border border-black/10 bg-white px-3 text-base outline-none focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36]/15 sm:h-11 sm:text-sm';
const list = (value: string) => value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);

const formFor = (contact: Contact | null) => ({
  kind: contact?.contactKind || 'person',
  displayName: contact?.contactName || '',
  givenName: contact?.contactGivenName || '',
  surname: contact?.contactSurname || '',
  organization: contact?.contactOrganization || '',
  jobTitle: contact?.contactJobTitle || '',
  email: contact?.contactEmail || '',
  phone: contact?.contactPhone || '',
  preferredContactMethod: contact?.preferredContactMethod || '',
  roles: (contact?.contactRoles || []).join(', '),
  territories: (contact?.contactTerritories || []).join(', '),
  city: contact?.contactCity || '',
  region: contact?.contactState || '',
  country: contact?.contactCountry || '',
  latitude: contact?.contactLatitude == null ? null : Number(contact.contactLatitude),
  longitude: contact?.contactLongitude == null ? null : Number(contact.contactLongitude),
  tags: (contact?.contactTags || []).join(', '),
  notes: contact?.contactNotes || '',
});

export default function EditContactDialog({ contact, open, onOpenChange, onSaved }: {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => formFor(contact));
  const [saving, setSaving] = useState(false);
  const [locationPending, setLocationPending] = useState(false);

  useEffect(() => {
    if (contact) setForm(formFor(contact));
  }, [contact]);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const setLocation = useCallback((location: ContactLocation) => setForm((current) => ({ ...current, ...location })), []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!contact || saving || !form.displayName.trim()) return;
    if (locationPending) return toast.error('Choose a Google location suggestion before saving');
    setSaving(true);
    try {
      const entityId = getEntityId();
      const response = await fetch(`/api/contacts/private/${encodeURIComponent(contact.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(entityId ? { 'X-Entity-Id': entityId } : {}) },
        body: JSON.stringify({
          ...form,
          roles: list(form.roles),
          territories: list(form.territories),
          tags: list(form.tags),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || body.error || 'Could not update contact');
      toast.success(`${form.displayName} updated`);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update contact');
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}>
    <DialogContent
      className="!left-0 !top-0 h-[100dvh] w-full max-w-none !translate-x-0 !translate-y-0 overflow-y-auto rounded-none border-0 bg-[#fffaf2] px-4 pb-24 pt-[calc(1rem+env(safe-area-inset-top))] sm:!left-1/2 sm:!top-1/2 sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-[24px] sm:border sm:p-8"
      onInteractOutside={(event) => {
        if ((event.target as HTMLElement | null)?.closest?.('.pac-container')) event.preventDefault();
      }}
      onPointerDownOutside={(event) => {
        if ((event.target as HTMLElement | null)?.closest?.('.pac-container')) event.preventDefault();
      }}
    >
      <DialogHeader className="pr-12 text-left"><DialogTitle className="text-2xl font-black">Edit {contact?.contactName || 'private contact'}</DialogTitle><DialogDescription>Changes update this private contact everywhere in your workspace.</DialogDescription></DialogHeader>
      <form onSubmit={save} className="mt-3 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact type"><select value={form.kind} onChange={(event) => set('kind', event.target.value)} className={inputClass}><option value="person">Person</option><option value="organization">Organisation</option></select></Field>
          <Field label="Display name"><input required maxLength={200} value={form.displayName} onChange={(event) => set('displayName', event.target.value)} className={inputClass} /></Field>
          <Field label="Given name"><input maxLength={100} value={form.givenName} onChange={(event) => set('givenName', event.target.value)} className={inputClass} /></Field>
          <Field label="Surname"><input maxLength={100} value={form.surname} onChange={(event) => set('surname', event.target.value)} className={inputClass} /></Field>
          <Field label="Organisation"><input maxLength={200} value={form.organization} onChange={(event) => set('organization', event.target.value)} className={inputClass} /></Field>
          <Field label="Job title"><input maxLength={160} value={form.jobTitle} onChange={(event) => set('jobTitle', event.target.value)} className={inputClass} /></Field>
          <Field label="Email"><input type="email" maxLength={254} value={form.email} onChange={(event) => set('email', event.target.value)} className={inputClass} /></Field>
          <Field label="Phone"><input type="tel" maxLength={80} value={form.phone} onChange={(event) => set('phone', event.target.value)} className={inputClass} /></Field>
          <Field label="Preferred contact method"><select value={form.preferredContactMethod} onChange={(event) => set('preferredContactMethod', event.target.value)} className={inputClass}><option value="">Not specified</option><option value="email">Email</option><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="other">Other</option></select></Field>
          <Field label="Roles"><input value={form.roles} onChange={(event) => set('roles', event.target.value)} className={inputClass} /></Field>
          <Field label="Territories"><input value={form.territories} onChange={(event) => set('territories', event.target.value)} className={inputClass} /></Field>
        </div>
        <ContactLocationPicker key={contact?.id} location={{ city: form.city, region: form.region, country: form.country, latitude: form.latitude, longitude: form.longitude }} onChange={setLocation} onPendingChange={setLocationPending} />
        <Field label="Tags"><input value={form.tags} onChange={(event) => set('tags', event.target.value)} className={inputClass} /></Field>
        <Field label="Notes"><textarea maxLength={10000} value={form.notes} onChange={(event) => set('notes', event.target.value)} className={`${inputClass} min-h-24 py-3`} /></Field>
        <div className="mobile-safe-bottom sticky bottom-0 z-20 -mx-4 grid grid-cols-2 gap-3 border-t border-black/10 bg-[#fffaf2]/95 p-4 backdrop-blur sm:static sm:mx-0 sm:flex sm:justify-end sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-5"><button type="button" onClick={() => onOpenChange(false)} disabled={saving} className="min-h-12 rounded-md border border-black/15 px-5 py-2.5 text-sm font-bold disabled:opacity-50">Cancel</button><button disabled={saving || locationPending || !form.displayName.trim()} className="min-h-12 rounded-md bg-[#ff5a36] px-6 py-2.5 text-sm font-black text-white hover:bg-[#e54525] disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-[#777168]">{label}</span>{children}</label>;
}
