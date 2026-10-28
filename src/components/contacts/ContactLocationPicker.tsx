'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import PlacesAutocomplete from '@/components/ui/PlacesAutocomplete';

export interface ContactLocation {
  city: string;
  region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

const CITY_TYPES = ['(cities)'];
const component = (place: google.maps.places.PlaceResult, type: string) =>
  place.address_components?.find((item) => item.types.includes(type))?.long_name || '';

export function contactLocationFromPlace(place: google.maps.places.PlaceResult): ContactLocation | null {
  const latitude = place.geometry?.location?.lat();
  const longitude = place.geometry?.location?.lng();
  const city = component(place, 'locality') || component(place, 'postal_town')
    || component(place, 'administrative_area_level_2') || place.name || '';
  const region = component(place, 'administrative_area_level_1');
  const country = component(place, 'country');
  if (!city || !country || typeof latitude !== 'number' || typeof longitude !== 'number'
    || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { city, region, country, latitude, longitude };
}

export default function ContactLocationPicker({ location, onChange, onPendingChange }: {
  location: ContactLocation;
  onChange: (location: ContactLocation) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [query, setQuery] = useState(location.city);
  const onChangeRef = useRef(onChange);
  const confirmed = location.latitude != null && location.longitude != null;

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    onPendingChange?.(Boolean(query.trim()) && !confirmed);
  }, [confirmed, onPendingChange, query]);

  const handleInput = useCallback((value: string) => {
    setQuery(value);
    onChangeRef.current({ city: '', region: '', country: '', latitude: null, longitude: null });
  }, []);

  const handlePlace = useCallback((place: google.maps.places.PlaceResult) => {
    const selected = contactLocationFromPlace(place);
    if (!selected) return;
    setQuery(selected.city);
    onChangeRef.current(selected);
  }, []);

  return <div>
    <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-[#777168]">City / region / country</span>
      <div className="relative"><MapPin aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#ff5a36]" size={17} /><PlacesAutocomplete value={query} onChange={handleInput} onPlaceSelect={handlePlace} types={CITY_TYPES} placeholder="Start typing a city, then choose the correct result" className="h-12 w-full rounded-md border border-black/10 bg-white pl-10 pr-3 text-base outline-none focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36]/15 sm:h-11 sm:text-sm" /></div>
    </label>
    {confirmed ? <div className="mt-3 flex items-start gap-2 rounded-md border border-[#b9d77a] bg-[#f4f9e8] px-3 py-2 text-sm text-[#48572d]"><CheckCircle2 className="mt-0.5 shrink-0" size={16} /><span><strong>Confirmed:</strong> {[location.city, location.region, location.country].filter(Boolean).join(', ')}</span></div>
      : query.trim() ? <p className="mt-2 text-xs font-semibold text-[#a54a32]">Choose a Google suggestion to confirm this location and place it on the map.</p>
      : <p className="mt-2 text-xs text-[#777168]">Optional. Selecting a result saves its canonical city, region, country and map coordinates.</p>}
  </div>;
}
