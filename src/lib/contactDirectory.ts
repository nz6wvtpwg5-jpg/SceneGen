import type { Contact } from '@/hooks/useContacts';

export type ContactPosition = [number, number];

export type ContactShowCity = {
  city: string;
  state: string;
  country: string;
  latitude: string | number | null;
  longitude: string | number | null;
  showCount: number;
};
export type ContactPlace = { city: string; state: string; country: string; source: 'contact' | 'show' };
export type ContactMapPoint = ContactPlace & { position: ContactPosition };

const cleaned = (value: unknown) => typeof value === 'string' ? value.trim() : '';

function coordinates(latitude: string | number | null | undefined, longitude: string | number | null | undefined): ContactPosition | null {
  if (latitude == null || longitude == null || latitude === '' || longitude === '') return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

export function contactTags(contact: Contact) {
  return Array.isArray(contact.contactTags)
    ? contact.contactTags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim()))
    : [];
}

/**
 * Only show actual historical performances returned by the scoped Contacts API.
 * Never copy these cities onto the contact's personal location fields.
 */
export function contactShowCities(contact: Contact): ContactShowCity[] {
  if (contact.source !== 'private' || !Array.isArray(contact.showLocations)) return [];
  const cities = new Map<string, ContactShowCity>();
  for (const show of contact.showLocations) {
    const city = cleaned(show.city);
    if (!city) continue;
    const state = cleaned(show.state);
    const country = cleaned(show.country);
    const key = [city, state, country].map((part) => part.toLocaleLowerCase()).join('|');
    const existing = cities.get(key);
    const position = coordinates(show.latitude, show.longitude);
    if (existing) {
      existing.showCount += 1;
      // Some old shows lack map coordinates: prefer any valid venue location.
      if (!coordinates(existing.latitude, existing.longitude) && position) {
        existing.latitude = position[0];
        existing.longitude = position[1];
      }
    } else {
      cities.set(key, {
        city, state, country,
        latitude: position?.[0] ?? null,
        longitude: position?.[1] ?? null,
        showCount: 1,
      });
    }
  }
  return Array.from(cities.values()).sort((a, b) =>
    a.city.localeCompare(b.city) || a.country.localeCompare(b.country) || a.state.localeCompare(b.state));
}

export function contactPlaces(contact: Contact): ContactPlace[] {
  const places: ContactPlace[] = [];
  const city = cleaned(contact.contactCity);
  const state = cleaned(contact.contactState);
  const country = cleaned(contact.contactCountry);
  if (city || state || country) places.push({ city, state, country, source: 'contact' });
  for (const venue of contactShowCities(contact)) {
    places.push({ city: venue.city, state: venue.state, country: venue.country, source: 'show' });
  }
  return places;
}

export function contactMapPoints(contact: Contact): ContactMapPoint[] {
  const points: ContactMapPoint[] = [];
  for (const show of contactShowCities(contact)) {
    const position = coordinates(show.latitude, show.longitude);
    if (position) points.push({ city: show.city, state: show.state, country: show.country, source: 'show', position });
  }
  const ownPosition = coordinates(contact.contactLatitude, contact.contactLongitude);
  if (ownPosition) points.push({
    city: cleaned(contact.contactCity), state: cleaned(contact.contactState),
    country: cleaned(contact.contactCountry), source: 'contact', position: ownPosition,
  });
  return points;
}

export function contactPosition(contact: Contact): ContactPosition | null {
  return contactMapPoints(contact)[0]?.position || null;
}
