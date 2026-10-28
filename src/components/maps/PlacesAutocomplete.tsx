'use client';

import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const libraries: ("places")[] = ["places"];

interface PlacesAutocompleteProps {
  value: string;
  onChange: (
    address: string,
    lat: number,
    lng: number,
    name?: string,
    city?: string,
    state?: string,
    country?: string
  ) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  searchCity?: string;
  searchState?: string;
  searchCountry?: string;
}

const COUNTRY_CODES: Record<string, string> = {
  austria: 'at', belgium: 'be', canada: 'ca', denmark: 'dk', finland: 'fi',
  france: 'fr', germany: 'de', ireland: 'ie', italy: 'it', netherlands: 'nl',
  norway: 'no', portugal: 'pt', spain: 'es', sweden: 'se', switzerland: 'ch',
  'united kingdom': 'gb', uk: 'gb', england: 'gb', scotland: 'gb', wales: 'gb',
  'united states': 'us', 'united states of america': 'us', usa: 'us', us: 'us',
};

function countryCode(country?: string): string | undefined {
  if (!country) return undefined;
  const normalized = country.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(normalized)) return normalized;
  return COUNTRY_CODES[normalized];
}

export function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Enter venue address",
  label,
  error,
  searchCity,
  searchState,
  searchCountry,
}: PlacesAutocompleteProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const geocodeRequestRef = useRef(0);

  useEffect(() => setInputValue(value), [value]);

  const applySearchContext = useCallback((instance: google.maps.places.Autocomplete) => {
    const restriction = countryCode(searchCountry);
    instance.setOptions({
      componentRestrictions: restriction ? { country: restriction } : undefined,
      fields: ['formatted_address', 'geometry', 'name', 'address_components', 'types'],
      strictBounds: false,
      types: ['establishment'],
    });

    const query = [searchCity, searchState, searchCountry].filter(Boolean).join(', ');
    if (!query || !window.google?.maps?.Geocoder) return;

    const requestId = ++geocodeRequestRef.current;
    new google.maps.Geocoder().geocode({ address: query }, (results, status) => {
      if (requestId !== geocodeRequestRef.current) return;
      if (status !== google.maps.GeocoderStatus.OK || !results?.[0]?.geometry) return;

      const geometry = results[0].geometry;
      if (geometry.viewport) {
        instance.setBounds(geometry.viewport);
        return;
      }

      if (geometry.location) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(geometry.location);
        instance.setBounds(bounds);
      }
    });
  }, [searchCity, searchState, searchCountry]);

  const onLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    console.log('🟢 [PlacesAutocomplete/maps] onLoad called - Autocomplete instance created');
    setAutocomplete(autocompleteInstance);
    applySearchContext(autocompleteInstance);
  };

  useEffect(() => {
    if (autocomplete) applySearchContext(autocomplete);
  }, [autocomplete, applySearchContext]);

  const onPlaceChanged = () => {
    console.log('🔥 [PlacesAutocomplete/maps] onPlaceChanged called!');
    console.log('🔥 [PlacesAutocomplete/maps] autocomplete exists:', !!autocomplete);

    if (autocomplete) {
      const place = autocomplete.getPlace();
      console.log('📍 [PlacesAutocomplete/maps] place object:', place);

      if (place.geometry && place.geometry.location) {
        const address = place.formatted_address || '';
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const name = place.name || '';

        // Extract city and state from address components
        let city = '';
        let state = '';
        let country = '';

        if (place.address_components) {
          for (const component of place.address_components) {
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name; // Use short name for state (e.g., "GA" instead of "Georgia")
            }
            if (component.types.includes('country')) {
              country = component.long_name;
            }
          }
        }

        console.log('✅ [PlacesAutocomplete/maps] Extracted data:', { address, lat, lng, name, city, state, country });
        setInputValue(address);
        console.log('📞 [PlacesAutocomplete/maps] Calling onChange callback...');
        onChange(address, lat, lng, name, city, state, country);
        console.log('✅ [PlacesAutocomplete/maps] onChange callback completed');
      } else {
        console.warn('⚠️ [PlacesAutocomplete/maps] No geometry in place object');
      }
    } else {
      console.warn('⚠️ [PlacesAutocomplete/maps] No autocomplete instance available');
    }
  };

  if (loadError) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="text-sm text-semantic-error">Error loading Google Maps</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Input disabled placeholder="Loading Google Maps..." />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          fields: ['formatted_address', 'geometry', 'name', 'address_components'],
          types: ['establishment'],
          componentRestrictions: countryCode(searchCountry)
            ? { country: countryCode(searchCountry)! }
            : undefined,
        }}
      >
        <Input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
          className={error ? 'border-semantic-error' : ''}
        />
      </Autocomplete>
      {searchCity && (
        <p className="text-xs text-text-tertiary">
          Showing venues near {searchCity}{searchCountry ? `, ${searchCountry}` : ''} first.
        </p>
      )}
      {error && <p className="text-sm text-semantic-error">{error}</p>}
    </div>
  );
}
