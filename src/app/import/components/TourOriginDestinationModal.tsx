'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, MapPin, Navigation } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CityAutocomplete from '@/components/ui/PlacesAutocomplete';

type TourCity = { city: string; state: string; lat?: number; lng?: number };

interface TourOriginDestinationModalProps {
  open: boolean;
  onConfirm: (origin: TourCity | null, destination: TourCity | null) => void;
  onCancel: () => void;
  firstShow: TourCity;
  lastShow: TourCity;
}

const CITY_TYPES = ['(cities)'];

function locationLabel(location: Pick<TourCity, 'city' | 'state'>): string {
  return [location.city, location.state].filter(Boolean).join(', ');
}

function cityFromPlace(place: google.maps.places.PlaceResult): TourCity | null {
  const location = place.geometry?.location;
  if (!location) return null;
  const component = (type: string, short = false) => {
    const value = place.address_components?.find(item => item.types.includes(type));
    return value ? (short ? value.short_name : value.long_name) : '';
  };
  const city = component('locality') || component('postal_town')
    || component('administrative_area_level_2') || place.name || '';
  if (!city) return null;
  return {
    city,
    state: component('administrative_area_level_1', true),
    lat: location.lat(),
    lng: location.lng(),
  };
}

export function TourOriginDestinationModal({ open, onConfirm, onCancel, firstShow, lastShow }: TourOriginDestinationModalProps) {
  const [useFirstShowAsOrigin, setUseFirstShowAsOrigin] = useState(true);
  const [useLastShowAsDestination, setUseLastShowAsDestination] = useState(true);
  const [originInputValue, setOriginInputValue] = useState('');
  const [destinationInputValue, setDestinationInputValue] = useState('');
  const [customOrigin, setCustomOrigin] = useState<TourCity | null>(null);
  const [customDestination, setCustomDestination] = useState<TourCity | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUseFirstShowAsOrigin(true);
    setUseLastShowAsDestination(true);
    setOriginInputValue('');
    setDestinationInputValue('');
    setCustomOrigin(null);
    setCustomDestination(null);
    setValidationError(null);
  }, [open]);

  useEffect(() => {
    if (!open || document.getElementById('pac-container-modal-fix')) return;
    const style = document.createElement('style');
    style.id = 'pac-container-modal-fix';
    style.textContent = '.pac-container { z-index: 99999 !important; pointer-events: auto !important; }';
    document.head.appendChild(style);
  }, [open]);

  const updateOriginInput = useCallback((value: string) => {
    setOriginInputValue(value);
    setCustomOrigin(null);
    setValidationError(null);
  }, []);
  const updateDestinationInput = useCallback((value: string) => {
    setDestinationInputValue(value);
    setCustomDestination(null);
    setValidationError(null);
  }, []);
  const selectOrigin = useCallback((place: google.maps.places.PlaceResult) => {
    const city = cityFromPlace(place);
    if (!city) {
      setValidationError('That origin could not be identified as a city. Choose another city suggestion.');
      return;
    }
    setCustomOrigin(city);
    setOriginInputValue(place.formatted_address || locationLabel(city));
    setValidationError(null);
  }, []);
  const selectDestination = useCallback((place: google.maps.places.PlaceResult) => {
    const city = cityFromPlace(place);
    if (!city) {
      setValidationError('That destination could not be identified as a city. Choose another city suggestion.');
      return;
    }
    setCustomDestination(city);
    setDestinationInputValue(place.formatted_address || locationLabel(city));
    setValidationError(null);
  }, []);
  const handleConfirm = () => {
    if (!useFirstShowAsOrigin && !customOrigin) {
      setValidationError('Choose an origin city from the suggestions. A street address is not required.');
      return;
    }
    if (!useLastShowAsDestination && !customDestination) {
      setValidationError('Choose a destination city from the suggestions. A street address is not required.');
      return;
    }
    onConfirm(useFirstShowAsOrigin ? null : customOrigin, useLastShowAsDestination ? null : customDestination);
  };

  const renderCityChoice = (kind: 'origin' | 'destination') => {
    const isOrigin = kind === 'origin';
    const useShow = isOrigin ? useFirstShowAsOrigin : useLastShowAsDestination;
    const setUseShow = isOrigin ? setUseFirstShowAsOrigin : setUseLastShowAsDestination;
    const show = isOrigin ? firstShow : lastShow;
    const value = isOrigin ? originInputValue : destinationInputValue;
    const updateValue = isOrigin ? updateOriginInput : updateDestinationInput;
    const selectPlace = isOrigin ? selectOrigin : selectDestination;
    const selected = isOrigin ? customOrigin : customDestination;
    const Icon = isOrigin ? MapPin : Navigation;

    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Tour {kind}</h3>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-subtle bg-surface-elevated/50 p-3">
          <input type="radio" name={`tour-${kind}`} checked={useShow}
            onChange={() => { setUseShow(true); setValidationError(null); }} className="h-4 w-4" />
          <span>
            <span className="font-medium">{isOrigin ? 'Start at the first show' : 'Finish at the last show'}</span>
            <span className="block text-sm text-text-tertiary">{locationLabel(show)}</span>
          </span>
        </label>
        <div className="rounded-lg border border-border-subtle p-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input type="radio" name={`tour-${kind}`} checked={!useShow}
              onChange={() => { setUseShow(false); setValidationError(null); }} className="h-4 w-4" />
            <span className="font-medium">{isOrigin ? 'Start' : 'Finish'} in another city</span>
          </label>
          {!useShow && (
            <div className="mt-3 pl-7">
              <CityAutocomplete value={value} onChange={updateValue} onPlaceSelect={selectPlace}
                placeholder="Search city, e.g. London" useFullAddress types={CITY_TYPES} />
              {selected && (
                <p className="mt-2 flex items-center gap-1 text-sm text-semantic-success">
                  <CheckCircle className="h-4 w-4" /> City selected: {locationLabel(selected)}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl"
        onInteractOutside={event => { if ((event.target as HTMLElement).closest('.pac-container')) event.preventDefault(); }}
        onPointerDownOutside={event => { if ((event.target as HTMLElement).closest('.pac-container')) event.preventDefault(); }}>
        <DialogTitle>Tour origin &amp; destination</DialogTitle>
        <DialogDescription>
          Choose city centres for the journey before the first show and after the last show. No street address is needed.
        </DialogDescription>
        <div className="space-y-6 py-4">
          {renderCityChoice('origin')}
          {renderCityChoice('destination')}
          {validationError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-semantic-error/30 bg-semantic-error/10 p-3 text-sm text-semantic-error">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" /><span>{validationError}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleConfirm}>Continue</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
