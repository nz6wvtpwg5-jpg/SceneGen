'use client';
import { useEffect, useState } from 'react';
import PlacesAutocomplete from '@/components/ui/PlacesAutocomplete';

export interface StoredVenue {
  id: string; googlePlaceId?: string; name: string; address?: string; city: string;
  region?: string; country?: string; countryCode?: string; postalCode?: string;
  latitude?: number; longitude?: number; capacity?: number; usageCount: number;
}

type Props = {
  value: string; onChange: (value: string) => void;
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  onStoredVenueSelect: (venue: StoredVenue) => void;
  city?: string; country?: string; className?: string; placeholder?: string;
};

export default function VenueDirectoryAutocomplete({ value, onChange, onPlaceSelect, onStoredVenueSelect, city, country, className, placeholder }: Props) {
  const [venues, setVenues] = useState<StoredVenue[]>([]);
  const [open, setOpen] = useState(false);
  const query = value.trim();

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ query });
        if (city) params.set('city', city);
        if (country) params.set('country', country);
        const response = await fetch(`/api/venues?${params}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        const results = Array.isArray(data.venues) ? data.venues : [];
        setVenues(results);
        setOpen(results.length > 0);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setVenues([]);
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [city, country, query]);

  const visibleVenues = query.length >= 2 ? venues : [];
  return <div className="relative">
    <PlacesAutocomplete value={value} onChange={(next) => { onChange(next); setOpen(true); }} onPlaceSelect={(place) => { setOpen(false); onPlaceSelect(place); }} placeholder={placeholder || 'Search SceneGen and Google venues…'} className={className} />
    {open && visibleVenues.length > 0 && <div className="absolute z-[1001] mt-1 max-h-64 w-full overflow-auto rounded-lg border border-black/10 bg-white shadow-xl">
      {visibleVenues.map((venue) => <button type="button" key={venue.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setOpen(false); onStoredVenueSelect(venue); }} className="block w-full border-b border-black/5 px-4 py-3 text-left last:border-0 hover:bg-[#f5efe5]">
        <span className="block font-semibold text-[#171713]">{venue.name}</span>
        <span className="block text-xs text-[#686258]">{[venue.address, venue.city, venue.country].filter(Boolean).join(' · ')}{venue.usageCount > 0 ? ` · Used for ${venue.usageCount} show${venue.usageCount === 1 ? '' : 's'}` : ''}</span>
      </button>)}
    </div>}
  </div>;
}
