'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, MapPin, MapPinned, Pencil, Phone, Tags } from 'lucide-react';
import type { Contact } from '@/hooks/useContacts';
import { contactPosition, contactShowCities, contactTags } from '@/lib/contactDirectory';
import EditContactDialog from './EditContactDialog';
import VenuePhoto from '@/components/venues/VenuePhoto';

const title = (value?: string) => value?.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()) || 'Unspecified';

export default function ContactsTable({ contacts, onShowMap, onContactUpdated }: { contacts: Contact[]; onShowMap?: (contact: Contact) => void; onContactUpdated?: () => void }) {
  const [editing, setEditing] = useState<Contact | null>(null);
  return <>
  <div className="mt-5 overflow-hidden rounded-lg border border-black/10 bg-[#fffaf2] shadow-sm">
    <div className="hidden grid-cols-[minmax(13rem,1.3fr)_1fr_1.2fr_1.4fr_auto] gap-4 border-b border-black/10 bg-[#eee6da]/70 px-5 py-3 text-[10px] font-black uppercase tracking-[.14em] text-[#777168] md:grid"><span>Contact</span><span>Role</span><span>Location</span><span>Tags</span><span>Actions</span></div>
    <div className="divide-y divide-black/10">{contacts.map((contact) => {
      const mapped = contactPosition(contact) !== null;
      const tags = contactTags(contact);
      const venueId = (contact.contactType?.toLowerCase() === 'venue' || contact.contactRoles?.includes('venue')) ? (contact.contactNotes?.match(/SceneGen venue ID: ([0-9a-f-]{36})/i)?.[1] || (contact.source === 'venue' ? contact.id : null)) : null;
      return <div key={contact.id}>
        <article className="p-4 md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {venueId && <Link href={"/venues/"+venueId}><VenuePhoto venueId={venueId} className="mb-2 h-28 w-40 rounded-lg"/></Link>}
              {venueId ? <Link href={'/venues/'+venueId} className="block truncate text-lg font-black hover:text-[#e54525]">{contact.contactName}</Link> : contact.contactEntityId ? <Link href={`/profile/${encodeURIComponent(contact.contactEntityId)}`} className="block truncate text-lg font-black hover:text-[#e54525]">{contact.contactName || 'Unnamed contact'}</Link> : <p className="truncate text-lg font-black">{contact.contactName || 'Unnamed contact'}</p>}
              <p className="mt-1 text-sm font-semibold text-[#686258]">{title(contact.contactJobTitle || contact.contactRoles?.[0] || contact.contactType)}{contact.contactOrganization ? ` · ${contact.contactOrganization}` : ''}</p>
            </div>
            {contact.source === 'private' && <button type="button" onClick={() => setEditing(contact)} aria-label={`Edit ${contact.contactName}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-[#5f5a52]"><Pencil size={18} /></button>}
          </div>
          <div className="mt-3"><ContactLocations contact={contact} /></div>
          {tags.length > 0 && <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">{tags.slice(0, 5).map((tag) => <span key={tag} className="shrink-0 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs text-[#686258]">{tag}</span>)}</div>}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {contact.contactPhone ? <a href={`tel:${contact.contactPhone.replace(/[^\d+*#,;]/g, '')}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#171713] px-3 text-sm font-bold text-white"><Phone size={17} />Call</a> : <span className="flex min-h-12 items-center justify-center rounded-xl bg-[#eee6da] text-sm text-[#9a9388]">No phone</span>}
            {contact.contactEmail ? <a href={`mailto:${encodeURIComponent(contact.contactEmail)}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-bold"><Mail size={17} />Email</a> : <span className="flex min-h-12 items-center justify-center rounded-xl bg-[#eee6da] text-sm text-[#9a9388]">No email</span>}
            <button type="button" disabled={!mapped} onClick={() => mapped && onShowMap?.(contact)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm font-bold disabled:opacity-35"><MapPinned size={17} />Map</button>
          </div>
        </article>
        <article className="hidden gap-4 px-5 py-5 transition hover:bg-white md:grid md:grid-cols-[minmax(13rem,1.3fr)_1fr_1.2fr_1.4fr_auto] md:items-center">
        <div className="min-w-0">{venueId && <Link href={"/venues/"+venueId}><VenuePhoto venueId={venueId} className="mb-2 h-24 w-36 rounded-lg"/></Link>}{venueId ? <Link href={'/venues/'+venueId} className="font-black hover:text-[#e54525]">{contact.contactName}</Link> : contact.contactEntityId ? <Link href={`/profile/${encodeURIComponent(contact.contactEntityId)}`} className="font-black hover:text-[#e54525]">{contact.contactName || 'Unnamed contact'}</Link> : <p className="font-black">{contact.contactName || 'Unnamed contact'}</p>}<p className="mt-1 text-xs text-[#8a847a]">{contact.source === 'private' ? 'Private address-book contact' : `Connected ${new Date(contact.acceptedAt || contact.createdAt).toLocaleDateString()}`}</p>{contact.contactEmail && <a href={`mailto:${encodeURIComponent(contact.contactEmail)}`} className="mt-2 flex items-center gap-1.5 truncate text-xs text-[#5f5a52] hover:text-[#e54525]"><Mail size={12} />{contact.contactEmail}</a>}{contact.contactPhone && <a href={`tel:${encodeURIComponent(contact.contactPhone)}`} className="mt-1 flex items-center gap-1.5 text-xs text-[#5f5a52] hover:text-[#e54525]"><Phone size={12} />{contact.contactPhone}</a>}</div>
        <div><span className="rounded-full bg-[#eee6da] px-3 py-1 text-xs font-bold text-[#5f5a52]">{title(contact.contactJobTitle || contact.contactRoles?.[0] || contact.contactType)}</span>{contact.contactOrganization && <p className="mt-2 text-xs text-[#777168]">{contact.contactOrganization}</p>}</div>
        <ContactLocations contact={contact} />
        <div className="flex min-w-0 flex-wrap gap-1.5">{tags.length ? <>{tags.slice(0, 4).map((tag) => <span key={tag} className="rounded border border-black/10 bg-white px-2 py-1 text-xs text-[#686258]">{tag}</span>)}{tags.length > 4 && <span className="rounded bg-[#eee6da] px-2 py-1 text-xs text-[#686258]">+{tags.length - 4}</span>}</> : <span className="flex items-center gap-1.5 text-xs text-[#9a9388]"><Tags size={14} />No tags</span>}</div>
        <div className="flex gap-2 justify-self-start md:justify-self-end">{contact.source === 'private' && <button type="button" onClick={() => setEditing(contact)} title="Edit contact" aria-label={`Edit ${contact.contactName}`} className="rounded-full border border-black/10 p-2 text-[#5f5a52] hover:bg-[#eee6da] hover:text-[#e54525]"><Pencil size={17} /></button>}<button type="button" disabled={!mapped} onClick={() => mapped && onShowMap?.(contact)} title={mapped ? 'Show contact on map' : 'No coordinates supplied'} aria-label={mapped ? `Show ${contact.contactName} on map` : `${contact.contactName} has no map location`} className="rounded-full border border-black/10 p-2 text-[#5f5a52] hover:bg-[#eee6da] disabled:cursor-not-allowed disabled:opacity-25"><MapPinned size={17} /></button></div>
        </article>
      </div>;
    })}</div>
  </div>
  <EditContactDialog contact={editing} open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }} onSaved={() => { setEditing(null); onContactUpdated?.(); }} />
  </>;
}

function ContactLocations({ contact }: { contact: Contact }) {
  const cities = contactShowCities(contact);
  const knownLocation = [contact.contactCity, contact.contactState, contact.contactCountry].filter(Boolean).join(', ');

  return <div className="min-w-0 space-y-2 text-sm text-[#5f5a52]">
    {cities.length > 0 ? (
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 shrink-0 text-[#ff5a36]" size={15} />
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[.11em] text-[#777168]">Past show {cities.length === 1 ? 'city' : 'cities'}</p>
          <div className="flex flex-wrap gap-1.5">
            {cities.map((place) => (
              <span
                key={[place.city, place.state, place.country].map((value) => value.toLocaleLowerCase()).join('|')}
                title={place.showCount === 1 ? '1 show with this promoter' : `${place.showCount} shows with this promoter`}
                className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-[#504b43]"
              >
                {place.city}{place.country ? `, ${place.country}` : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <p className="flex items-start gap-2"><MapPin className="mt-0.5 shrink-0 text-[#ff5a36]" size={15} />{knownLocation || 'Location not supplied'}</p>
    )}
    {knownLocation && cities.length > 0 && <p className="pl-6 text-xs text-[#777168]">Contact location: {knownLocation}</p>}
  </div>;
}
