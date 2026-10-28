'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Icon, LatLngBounds, type LatLngTuple } from 'leaflet';
import type { Contact } from '@/hooks/useContacts';
import { contactMapPoints } from '@/lib/contactDirectory';
import 'leaflet/dist/leaflet.css';

const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [0, -41],
});

function FitContacts({ positions, focusPosition }: { positions: LatLngTuple[]; focusPosition: LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (focusPosition) map.setView(focusPosition, 10);
    else if (positions.length === 1) map.setView(positions[0], 10);
    else if (positions.length > 1) map.fitBounds(new LatLngBounds(positions), { padding: [45, 45], maxZoom: 10 });
  }, [focusPosition, map, positions]);
  return null;
}

export default function ContactMap({ contacts, focusContactId }: { contacts: Contact[]; focusContactId?: string | null }) {
  const mapped = useMemo(() => contacts.flatMap((contact) =>
    contactMapPoints(contact).map((place, index) => ({
      contact, place, position: place.position as LatLngTuple,
      key: `${contact.id}-${place.source}-${index}`,
    }))), [contacts]);
  const positions = useMemo(() => mapped.map(({ position }) => position), [mapped]);
  const focusPosition = useMemo(() => mapped.find(({ contact }) => contact.id === focusContactId)?.position || null, [focusContactId, mapped]);

  if (!mapped.length) return <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-black/15 bg-[#fffaf2] px-6 text-center"><div><p className="text-xl font-black">No mapped contacts in this view</p><p className="mt-2 text-sm text-[#6d685f]">Add a contact location or link promoters to shows with venue coordinates.</p></div></div>;

  return <div className="h-[32rem] overflow-hidden rounded-lg border border-black/10 bg-[#dbe8e6] shadow-sm">
    <MapContainer center={focusPosition || positions[0]} zoom={5} scrollWheelZoom className="h-full w-full">
      <FitContacts positions={positions} focusPosition={focusPosition} />
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <>{mapped.map(({ contact, place, position, key }) => <Marker key={key} position={position} icon={markerIcon}><Popup><strong>{contact.contactName || 'Unnamed contact'}</strong><br />{contact.contactType && <span>{contact.contactType.replace(/_/g, ' ')}<br /></span>}<span>{place.source === 'show' ? 'Past show city' : 'Contact location'}: {[place.city, place.state, place.country].filter(Boolean).join(', ')}</span>{contact.contactEntityId && <><br /><a href={`/profile/${encodeURIComponent(contact.contactEntityId)}`}>Open workspace</a></>}</Popup></Marker>)}</>
    </MapContainer>
  </div>;
}
