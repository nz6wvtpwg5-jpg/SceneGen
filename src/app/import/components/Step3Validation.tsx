'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, AlertCircle, AlertTriangle, CheckCircle, Loader2, MapPin, Plane, Coffee, Calendar, DollarSign } from 'lucide-react';
import type { ParsedCSV, FieldMapping, ValidationResult, ImportData, ImportBudget, ImportShow } from '@/types/import';
import { validateCSVData, transformToImportData, calculateImportStats, getDateRange, calculateDistancesForImport, detectImportCurrency } from '@/lib/csv/validator';
import { formatCurrency, formatDate } from '@/lib/csv/parser';
import { PlacesAutocomplete } from '@/components/maps/PlacesAutocomplete';
import CityAutocomplete from '@/components/ui/PlacesAutocomplete';
import { TourOriginDestinationModal } from './TourOriginDestinationModal';
import { toast } from 'sonner';

type ImportedShowType = 'show' | 'off_day' | 'travel_day';

type ResolvedCity = {
  key: string;
  status: 'resolved' | 'unresolved';
  label?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  partialMatch?: boolean;
};

type RoutingCoordinate = {
  address: string;
  lat: number;
  lng: number;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
};

const CITY_AUTOCOMPLETE_TYPES = ['(cities)'];

function resolvedCityFromPlace(key: string, place: google.maps.places.PlaceResult): ResolvedCity | null {
  const location = place.geometry?.location;
  if (!location) return null;
  const component = (type: string, short = false) => {
    const value = place.address_components?.find(item => item.types.includes(type));
    return value ? (short ? value.short_name : value.long_name) : undefined;
  };
  return {
    key,
    status: 'resolved',
    label: place.formatted_address || place.name || '',
    city: component('locality') || component('postal_town') || place.name,
    state: component('administrative_area_level_1', true),
    country: component('country'),
    lat: location.lat(),
    lng: location.lng(),
    partialMatch: false,
  };
}

function cityKey(show: ImportShow): string {
  return [show.city, show.state, show.country]
    .filter(Boolean)
    .map(value => String(value).trim().toLowerCase())
    .join('|');
}

function resolveImportedShowType(
  show: ImportShow | undefined,
  index: number,
  showTypes: Record<number, ImportedShowType>
): ImportedShowType {
  if (showTypes[index]) return showTypes[index];
  return show?.city.trim().toLowerCase() === 'off' ? 'off_day' : 'show';
}

function prepareBudgetsForImport(
  shows: ImportShow[],
  budgets: ImportBudget[],
  _showTypes: Record<number, ImportedShowType>,
  showAddresses: Record<number, { lat: number; lng: number }>
): ImportBudget[] {
  // A schedule classification must never delete accounting data. Off and
  // travel days can legitimately contain wages, vehicle hire, ferries, tolls,
  // hotels and many other costs. Only calculate routing mileage here.
  return calculateDistancesForImport(shows, budgets, showAddresses);
}

interface SingleShowFormProps {
  existingTourId: string;
  existingTourName: string;
  entityId: string;
}

function SingleShowForm({ existingTourId, existingTourName, entityId }: SingleShowFormProps) {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueData, setVenueData] = useState<{
    address: string;
    lat: number;
    lng: number;
    name?: string;
    city?: string;
    state?: string;
  } | null>(null);
  const [artistFee, setArtistFee] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceSelect = (address: string, lat: number, lng: number, name?: string, city?: string, state?: string) => {
    setVenueAddress(address);
    setVenueData({ address, lat, lng, name, city, state });
  };

  const handleSubmit = async () => {
    if (!date || !venueData || !artistFee) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the show - match API route expected field names
      const showData = {
        tourId: existingTourId,
        showDate: date,
        showTime: '20:00', // Default 8pm show time
        venueCity: venueData.city || 'Unknown',
        venueState: venueData.state || '',
        venueCountry: country.trim(),
        venueName: venueData.name || venueAddress,
        venueAddress: venueAddress,
        latitude: venueData.lat,
        longitude: venueData.lng,
        guarantee: parseFloat(artistFee),
      };


      const showResponse = await fetch('/api/shows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Entity-Id': entityId,
        },
        body: JSON.stringify(showData),
      });

      if (!showResponse.ok) {
        const errorData = await showResponse.json();
        console.error('❌ Backend error response:', errorData);
        throw new Error(`Failed to create show: ${showResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const showResult = await showResponse.json();

      // ALWAYS create a budget for the new show
      try {
        let templateBudget = null;

        // Try to fetch existing budgets to use as template
        try {
          const budgetsResponse = await fetch(`/api/budgets?tourId=${existingTourId}&entityId=${entityId}`, {
            headers: {
              'X-Entity-Id': entityId,
            },
          });

          if (budgetsResponse.ok) {
            const budgetsData = await budgetsResponse.json();
            const existingBudgets = budgetsData.budgets || [];

            if (existingBudgets.length > 0) {
              templateBudget = existingBudgets[0];
            } else {
            }
          }
        } catch (fetchError) {
        }

        // Create budget for the new show (with or without template)
        const budgetData = {
          entityId: entityId,  // Required by Next.js API route
          showId: showResult.show.id,
          tourId: existingTourId,
          budgetName: `${showResult.show.venueCity || 'Show'} Budget`,
          currency,
        };


        const budgetResponse = await fetch('/api/budgets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Entity-Id': entityId,
          },
          body: JSON.stringify(budgetData),
        });

        if (budgetResponse.ok) {
          const budgetResult = await budgetResponse.json();

          // Copy line items from template if available
          if (templateBudget?.line_items && templateBudget.line_items.length > 0) {
            const lineItemsPromises = templateBudget.line_items.map((item: any) => {
              const lineItemData = {
                budget_id: budgetResult.budget.id,
                category: item.category,
                description: item.description,
                type: item.type,
                amount: item.amount,
                is_percentage: item.is_percentage || item.isPercentage,
                percentage_of: item.percentage_of || item.percentageOf,
              };

              return fetch('/api/budgets/line-items', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Entity-Id': entityId,
                },
                body: JSON.stringify(lineItemData),
              });
            });

            await Promise.all(lineItemsPromises);
          } else {
          }
        } else {
          const errorData = await budgetResponse.json();
          console.error('❌ Budget creation failed:', errorData);
          console.error('❌ Error details:', JSON.stringify(errorData, null, 2));
          console.error('❌ Budget data sent:', JSON.stringify(budgetData, null, 2));
          throw new Error(`Budget creation failed: ${JSON.stringify(errorData)}`);
        }
      } catch (budgetError) {
        console.error('❌ Budget creation failed:', budgetError);
        toast.error('Show created but budget creation failed');
        // Don't throw - show was created successfully
      }

      // Recalculate distances for the tour
      try {
        const distanceResponse = await fetch(`/api/tours/${existingTourId}/calculate-distances`, {
          method: 'POST',
          headers: {
            'X-Entity-Id': entityId,
          },
        });

        if (distanceResponse.ok) {
          const distanceResult = await distanceResponse.json();
        } else {
          const errorData = await distanceResponse.json();
          console.warn('⚠️ Distance calculation failed:', errorData);
        }
      } catch (distanceError) {
        console.warn('⚠️ Distance calculation failed (non-fatal):', distanceError);
      }

      toast.success('Show added successfully!');

      // Redirect to tours page
      router.push('/tours');

    } catch (error) {
      console.error('❌ Error creating show:', error);
      toast.error('Failed to create show');
      setIsSubmitting(false);
    }
  };

  const isValid = date && venueData && country.trim() && currency && artistFee && parseFloat(artistFee) > 0;

  return (
    <div className="space-y-6">
      <div className="panel-dark p-6">
        <h2 className="text-2xl font-bold mb-2 text-[#151713]">Add Show to {existingTourName}</h2>
        <p className="text-text-secondary mb-6">
          Enter the show details. The budget structure will match existing shows in this tour.
        </p>

        <div className="space-y-6">
          {/* Date */}
          <div>
            <label htmlFor="show-date" className="flex items-center gap-2 text-sm font-medium text-[#151713] mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              Show Date
            </label>
            <input
              id="show-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-black/10 rounded-lg bg-white/70 text-[#151713] focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Venue Address */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[#151713] mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              Venue Name & Address
            </label>
            <PlacesAutocomplete
              value={venueAddress}
              onChange={handlePlaceSelect}
              placeholder="Search for venue (e.g., The Ryman, Nashville)"
            />
            {venueData && (
              <p className="text-xs text-semantic-success mt-2">
                ✓ {venueData.city}, {venueData.state} • Coordinates: {venueData.lat.toFixed(4)}, {venueData.lng.toFixed(4)}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="show-country" className="mb-2 block text-sm font-medium text-[#151713]">
                Country
              </label>
              <input
                id="show-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="e.g. Belgium"
                className="w-full rounded-lg border border-black/10 bg-white/70 px-4 py-3 text-[#151713] focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label htmlFor="show-currency" className="mb-2 block text-sm font-medium text-[#151713]">
                Fee currency
              </label>
              <select
                id="show-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="w-full rounded-lg border border-black/10 bg-white/70 px-4 py-3 text-[#151713] focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="" disabled>Select currency</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British pound (£)</option>
                <option value="USD">USD — US dollar ($)</option>
                <option value="CAD">CAD — Canadian dollar (C$)</option>
                <option value="AUD">AUD — Australian dollar (A$)</option>
                <option value="NZD">NZD — New Zealand dollar (NZ$)</option>
                <option value="JPY">JPY — Japanese yen (¥)</option>
                <option value="CHF">CHF — Swiss franc</option>
                <option value="SEK">SEK — Swedish krona</option>
                <option value="NOK">NOK — Norwegian krone</option>
                <option value="DKK">DKK — Danish krone</option>
                <option value="PLN">PLN — Polish złoty</option>
                <option value="CZK">CZK — Czech koruna</option>
              </select>
            </div>
          </div>

          {/* Artist Fee */}
          <div>
            <label htmlFor="artist-fee" className="flex items-center gap-2 text-sm font-medium text-[#151713] mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Artist Fee
            </label>
            <input
              id="artist-fee"
              type="number"
              value={artistFee}
              onChange={(e) => setArtistFee(e.target.value)}
              placeholder="5000"
              min="0"
              step="100"
              className="w-full px-4 py-3 border border-black/10 rounded-lg bg-white/70 text-[#151713] focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            {artistFee && parseFloat(artistFee) > 0 && (
              <p className="text-xs text-text-secondary mt-2">
                {currency ? formatCurrency(parseFloat(artistFee), currency) : 'Select the fee currency'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Show...
            </>
          ) : (
            'Add Show'
          )}
        </Button>
      </div>
    </div>
  );
}

interface Step3ValidationProps {
  parsedData?: ParsedCSV; // Optional for add-single-show mode
  mappings: FieldMapping[];
  entityId: string;
  existingTourId?: string;
  existingTourName?: string;
  mode?: string; // 'add-single-show' or undefined
  onComplete: (validation: ValidationResult, importData: ImportData) => void;
  onStartImport: (importData?: ImportData) => void;
  onBack?: () => void; // Optional for add-single-show mode
}

export function Step3Validation({
  parsedData,
  mappings,
  entityId,
  existingTourId,
  existingTourName,
  mode,
  onComplete,
  onStartImport,
  onBack,
}: Step3ValidationProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [tourOption, setTourOption] = useState<'new' | 'existing'>(existingTourId ? 'existing' : 'new');
  const [tourName, setTourName] = useState(existingTourName || '');
  const [selectedTourId, setSelectedTourId] = useState(existingTourId || '');
  const [existingTours, setExistingTours] = useState<any[]>([]);
  const [existingShows, setExistingShows] = useState<any[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [isLoadingExistingShows, setIsLoadingExistingShows] = useState(!!existingTourId);
  const [showAddresses, setShowAddresses] = useState<Record<number, RoutingCoordinate>>({});
  const [showTypes, setShowTypes] = useState<Record<number, 'show' | 'off_day' | 'travel_day'>>({});
  const [cityMismatch, setCityMismatch] = useState<{
    showIndex: number;
    csvCity: string;
    csvState?: string;
    newCity: string;
    newState?: string;
    addressData: RoutingCoordinate;
  } | null>(null);
  const [showOriginDestinationModal, setShowOriginDestinationModal] = useState(false);
  const [tourOrigin, setTourOrigin] = useState<{
    city: string;
    state: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [tourDestination, setTourDestination] = useState<{
    city: string;
    state: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [editableShows, setEditableShows] = useState<Record<number, boolean>>({});
  const currencyDetection = useMemo(
    () => parsedData ? detectImportCurrency(parsedData.rows, mappings) : null,
    [parsedData, mappings]
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [currencyConfirmed, setCurrencyConfirmed] = useState(false);
  const [resolvedCities, setResolvedCities] = useState<Record<string, ResolvedCity>>({});
  const [isResolvingCities, setIsResolvingCities] = useState(false);
  const [cityLookupError, setCityLookupError] = useState<string | null>(null);
  const [cityLookupAttempt, setCityLookupAttempt] = useState(0);
  const [citiesConfirmed, setCitiesConfirmed] = useState(false);
  const [editingCityKey, setEditingCityKey] = useState<string | null>(null);
  const [citySearchValues, setCitySearchValues] = useState<Record<string, string>>({});
  const [estimatedRoadMiles, setEstimatedRoadMiles] = useState<number | null>(null);
  const [isCalculatingMileage, setIsCalculatingMileage] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'import_anyway'>('skip');
  const lastResolvedCitySignature = useRef('');
  const effectiveCurrency = selectedCurrency || currencyDetection?.currency || '';

  const uniqueImportCities = useMemo(() => {
    if (!importData) return [];
    const unique = new Map<string, ImportShow>();
    importData.shows.forEach((show, index) => {
      if (resolveImportedShowType(show, index, showTypes) !== 'show') return;
      if (!show.city || show.city.trim().toLowerCase() === 'off') return;
      unique.set(cityKey(show), show);
    });
    return Array.from(unique.entries()).map(([key, show]) => ({
      key, city: show.city, state: show.state, country: show.country,
    }));
  }, [importData, showTypes]);

  useEffect(() => {
    if (mode === 'add-single-show' || uniqueImportCities.length === 0) return;
    const signature = JSON.stringify(uniqueImportCities);
    if (lastResolvedCitySignature.current === signature) return;
    let cancelled = false;
    setIsResolvingCities(true);
    setCityLookupError(null);
    setCitiesConfirmed(false);
    const resolveCities = async () => {
      try {
        let lastError: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (attempt > 0) await new Promise(resolve => setTimeout(resolve, attempt * 700));
          const response = await fetch('/api/import/resolve-cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cities: uniqueImportCities }),
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            lastError = new Error(payload?.error || 'City lookup is temporarily unavailable');
            continue;
          }
          const payload = await response.json();
          if (cancelled) return;
          const next = (payload.results as ResolvedCity[]).reduce<Record<string, ResolvedCity>>((all, city) => {
            all[city.key] = city;
            return all;
          }, {});
          setResolvedCities(next);
          lastResolvedCitySignature.current = signature;
          return;
        }
        throw lastError || new Error('City lookup is temporarily unavailable');
      } catch (error) {
        if (!cancelled) {
          setCityLookupError(error instanceof Error ? error.message : 'City lookup is temporarily unavailable');
        }
      } finally {
        if (!cancelled) setIsResolvingCities(false);
      }
    };
    void resolveCities();
    return () => { cancelled = true; };
  }, [mode, uniqueImportCities, cityLookupAttempt]);

  useEffect(() => {
    if (!citiesConfirmed || !importData) {
      setEstimatedRoadMiles(null);
      return;
    }
    const stops = importData.shows
      .map((show, index) => ({ show, index, city: resolvedCities[cityKey(show)] }))
      .filter(item => resolveImportedShowType(item.show, item.index, showTypes) === 'show')
      .filter(item => item.city?.status === 'resolved' && item.city.lat != null && item.city.lng != null)
      .sort((a, b) => new Date(a.show.date).getTime() - new Date(b.show.date).getTime());
    if (stops.length < 2) return;

    const locations = stops.map(stop => `${stop.city!.lat},${stop.city!.lng}`);
    const legs = locations.slice(0, -1).map((origin, index) => ({ origin, destination: locations[index + 1] }));
    const batches = Array.from({ length: Math.ceil(legs.length / 10) }, (_, index) => legs.slice(index * 10, index * 10 + 10));
    setIsCalculatingMileage(true);
    Promise.all(batches.map(async batch => {
      const response = await fetch('/api/calculate-route-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origins: batch.map(leg => leg.origin),
          destinations: batch.map(leg => leg.destination),
          paired: true,
        }),
      });
      if (!response.ok) throw new Error('Driving distance unavailable');
      return response.json();
    }))
      .then(payloads => setEstimatedRoadMiles(payloads.reduce(
        (routeTotal, payload) => routeTotal + (payload.distances as number[]).reduce(
          (batchTotal, distance) => batchTotal + distance, 0
        ), 0
      )))
      .catch(() => setEstimatedRoadMiles(null))
      .finally(() => setIsCalculatingMileage(false));
  }, [citiesConfirmed, importData, resolvedCities, showTypes]);

  const handleCityCorrection = (key: string, place: google.maps.places.PlaceResult) => {
    const corrected = resolvedCityFromPlace(key, place);
    if (!corrected) {
      toast.error('That city could not be located. Please choose a Google suggestion.');
      return;
    }
    setResolvedCities(current => ({ ...current, [key]: corrected }));
    setCitySearchValues(current => ({ ...current, [key]: corrected.label || '' }));
    setEditingCityKey(null);
    setCitiesConfirmed(false);
    setEstimatedRoadMiles(null);
  };

  useEffect(() => {
    // Skip CSV validation for single show mode
    if (mode === 'add-single-show') {
      setValidation({
        valid: true,
        errors: [],
        warnings: [],
        validRowCount: 0,
        skippedRowCount: 0
      });
      setImportData({
        shows: [],
        budgets: [],
        tour: { name: existingTourName || '' },
      });
      return;
    }

    // Validate data from CSV
    if (!parsedData) {
      console.error('❌ [Step3Validation] No parsedData provided');
      return;
    }

    const validationResult = validateCSVData(parsedData.rows, mappings);
    setValidation(validationResult);

    // Transform data
    const { shows, budgets } = transformToImportData(parsedData.rows, mappings, effectiveCurrency);

    // Get date range for default tour name
    const dateRange = getDateRange(shows);
    if (dateRange && !tourName) {
      const startDate = new Date(dateRange.startDate);
      const month = startDate.toLocaleDateString('en-US', { month: 'short' });
      const year = startDate.getFullYear();
      const defaultTourName = `Tour ${month} ${year}`;
      setTourName(defaultTourName);
    }

    const data: ImportData = {
      shows,
      budgets,
      duplicatePolicy,
      source: {
        kind: parsedData.sourceKind || 'csv',
        name: parsedData.sourceName,
        preset: parsedData.sourcePreset,
      },
      tour: {
        name: tourName,
        startDate: dateRange?.startDate,
        endDate: dateRange?.endDate,
        currency: effectiveCurrency,
      },
    };

    setImportData(data);
    setShowTypes(prev => {
      const inferredTypes = shows.reduce<Record<number, 'show' | 'off_day' | 'travel_day'>>((types, show, index) => {
        types[index] = show.city.trim().toLowerCase() === 'off' ? 'off_day' : 'show';
        return types;
      }, {});
      return { ...inferredTypes, ...prev };
    });
    onComplete(validationResult, data);

    // Fetch existing tours (only on first mount)
    if (existingTours.length === 0) {
      fetchExistingTours();
    }

    // If editing an existing tour, fetch its shows
    if (existingTourId) {
      fetchExistingTourShows(existingTourId);
    }
  }, [parsedData, mappings, effectiveCurrency]);

  useEffect(() => {
    if (!importData?.shows.length || mode === 'add-single-show') return;
    let cancelled = false;
    setIsCheckingDuplicates(true);
    fetch('/api/import/preview', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Entity-Id': entityId },
      body: JSON.stringify({ shows: importData.shows }),
    }).then(async response => {
      if (!response.ok) throw new Error('Duplicate preview unavailable');
      return response.json();
    }).then(payload => { if (!cancelled) setDuplicateCount(Array.isArray(payload.duplicates) ? payload.duplicates.length : 0); })
      .catch(() => { if (!cancelled) setDuplicateCount(0); })
      .finally(() => { if (!cancelled) setIsCheckingDuplicates(false); });
    return () => { cancelled = true; };
  }, [entityId, importData?.shows, mode]);

  // Match existing shows to CSV shows and pre-fill addresses
  useEffect(() => {
    if (!importData || !existingShows || existingShows.length === 0) {
      return;
    }

    const addresses: Record<number, any> = {};
    const types: Record<number, 'show' | 'off_day' | 'travel_day'> = {};

    // For each CSV show, check if it matches an existing show
    importData.shows.forEach((csvShow, csvIndex) => {
      const matchingExistingShow = existingShows.find((existingShow: any) => {
        // Normalize dates for comparison - extract just the date part (YYYY-MM-DD)
        const csvDateStr = csvShow.date?.substring(0, 10); // "2026-03-30"
        const existingDateStr = existingShow.date?.substring(0, 10); // "2026-03-30" from "2026-03-30T04:00:00.000Z"

        const dateMatch = csvDateStr === existingDateStr;

        // Match by date ONLY - the database has the correct city/venue data
        return dateMatch;
      });

      if (matchingExistingShow) {
        // Pre-fill address for this CSV show index
        // Check both camelCase (venueLat) and snake_case (venue_lat) for compatibility
        const lat = matchingExistingShow.venueLat || matchingExistingShow.venue_lat;
        const lng = matchingExistingShow.venueLng || matchingExistingShow.venue_lng;
        const address = matchingExistingShow.venueAddress || matchingExistingShow.venue_address;

        if (lat && lng) {
          addresses[csvIndex] = {
            address: address || `${matchingExistingShow.city}, ${matchingExistingShow.state}`,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            name: matchingExistingShow.venueName,
            city: matchingExistingShow.city,
            state: matchingExistingShow.state || matchingExistingShow.venueState,
          };
        }

        types[csvIndex] = matchingExistingShow.showType || matchingExistingShow.show_type || 'show';
      }
    });

    setShowAddresses(addresses);
    setShowTypes(types);

    // Set tour origin/destination from existing shows if not set
    if (!tourOrigin && existingShows.length > 0) {
      const firstShow = existingShows[0];
      if (firstShow.venue_lat && firstShow.venue_lng) {
        setTourOrigin({
          city: firstShow.city,
          state: firstShow.state,
          lat: firstShow.venue_lat,
          lng: firstShow.venue_lng,
        });
      }
    }
    if (!tourDestination && existingShows.length > 0) {
      const lastShow = existingShows[existingShows.length - 1];
      if (lastShow.venue_lat && lastShow.venue_lng) {
        setTourDestination({
          city: lastShow.city,
          state: lastShow.state,
          lat: lastShow.venue_lat,
          lng: lastShow.venue_lng,
        });
      }
    }
  }, [importData, existingShows]);

  const fetchExistingTours = async () => {
    try {
      const response = await fetch(`/api/tours?entityId=${entityId}`, {
        credentials: 'include',
        headers: {
          'X-Entity-Id': entityId,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const tours = data.tours || data;
        setExistingTours(tours);
        if (tours.length > 0) {
          setSelectedTourId(tours[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tours:', error);
    } finally {
      setIsLoadingTours(false);
    }
  };

  const fetchExistingTourShows = async (tourId: string) => {

    if (!tourId) {
      setIsLoadingExistingShows(false);
      return;
    }

    try {
      setIsLoadingExistingShows(true);

      const response = await fetch(`/api/tours/${tourId}/shows`, {
        credentials: 'include',
        headers: {
          'X-Entity-Id': entityId,
        },
      });


      if (response.ok) {
        const data = await response.json();
        const shows = data.shows || [];
        setExistingShows(shows);

        // NOTE: Do NOT pre-fill addresses here - let the useEffect handle matching
        // This prevents overwriting the addresses that will be matched by date/venue
      } else {
        console.error('❌ [fetchExistingTourShows] API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [fetchExistingTourShows] Failed to fetch tour shows:', error);
    } finally {
      setIsLoadingExistingShows(false);
    }
  };

  // Helper function to check if a show from CSV already exists in the tour
  const isShowAlreadySaved = (csvShow: any, csvShowIndex: number): boolean => {
    if (!existingShows || existingShows.length === 0) return false;

    // Check if we have a pre-filled address for this show index
    // If the matching useEffect found a match and added coordinates, the show is already saved
    // Note: The matching logic only adds to showAddresses if coordinates exist
    return !!showAddresses[csvShowIndex];
  };

  const handleAddressChange = (
    showIndex: number,
    address: string,
    lat: number,
    lng: number,
    name?: string,
    city?: string,
    state?: string,
    country?: string
  ) => {
    const show = importData?.shows[showIndex];
    const currentStoredCity = showAddresses[showIndex]?.city || show?.city;

    if (show && city && currentStoredCity && city.toLowerCase() !== currentStoredCity.toLowerCase()) {
      setCityMismatch({
        showIndex,
        csvCity: currentStoredCity,
        csvState: showAddresses[showIndex]?.state || show?.state,
        newCity: city,
        newState: state,
        addressData: { address, lat, lng, name, city, state, country },
      });
      return;
    }

    setShowAddresses(prev => ({
      ...prev,
      [showIndex]: { address, lat, lng, name, city, state, country },
    }));
  };

  const handleCityMismatchConfirm = (useNewCity: boolean) => {
    if (!cityMismatch) return;

    const { showIndex, addressData, csvCity, csvState } = cityMismatch;
    const finalAddressData = useNewCity
      ? addressData
      : { ...addressData, city: csvCity, state: csvState };

    setShowAddresses(prev => ({
      ...prev,
      [showIndex]: finalAddressData,
    }));

    if (importData) {
      const updatedShows = [...importData.shows];
      updatedShows[showIndex] = {
        ...updatedShows[showIndex],
        city: finalAddressData.city || updatedShows[showIndex].city,
        state: finalAddressData.state || updatedShows[showIndex].state,
        venueName: finalAddressData.name || updatedShows[showIndex].venueName,
      };
      setImportData({ ...importData, shows: updatedShows });
    }

    setCityMismatch(null);
  };

  const handleShowTypeChange = (showIndex: number, type: 'show' | 'off_day' | 'travel_day') => {
    setShowTypes(prev => ({
      ...prev,
      [showIndex]: type
    }));
  };

  const handleToggleEdit = (showIndex: number) => {
    setEditableShows(prev => ({
      ...prev,
      [showIndex]: !prev[showIndex]
    }));
  };

  const handleStartImport = () => {
    if (!importData) return;


    // Show tour origin/destination modal before proceeding
    setShowOriginDestinationModal(true);
  };

  const handleOriginDestinationConfirm = (
    origin: { city: string; state: string; lat?: number; lng?: number } | null,
    destination: { city: string; state: string; lat?: number; lng?: number } | null
  ) => {

    if (origin) {
      setTourOrigin(origin as { city: string; state: string; lat: number; lng: number });
    }
    if (destination) {
      setTourDestination(destination as { city: string; state: string; lat: number; lng: number });
    }

    setShowOriginDestinationModal(false);

    // Now proceed with the import
    proceedWithImport(origin, destination);
  };

  const handleOriginDestinationCancel = () => {
    setShowOriginDestinationModal(false);
  };

  const proceedWithImport = (
    origin: { city: string; state: string; lat?: number; lng?: number } | null,
    destination: { city: string; state: string; lat?: number; lng?: number } | null
  ) => {
    if (!importData) return;


    // Helper function to calculate Haversine distance
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    };

    // Recalculate ALL distances with origin and destination
    const showsWithCoords = importData.shows
      .map((s, idx) => ({ show: s, index: idx, address: routingCoordinates[idx] }))
      .filter(item => item.address?.lat != null && item.address?.lng != null)
      .sort((a, b) => new Date(a.show.date).getTime() - new Date(b.show.date).getTime());


    // Update budgets with recalculated distances
    const budgetsWithUpdatedDistances = importData.budgets.map(budget => {
      const showIdx = showsWithCoords.findIndex(item => item.index === budget.showIndex);
      if (showIdx === -1) return budget;

      let distance = 0;
      const currentShow = showsWithCoords[showIdx];
      const currentLat = currentShow.address.lat!;
      const currentLng = currentShow.address.lng!;

      if (showIdx === 0) {
        // First show - calculate distance from origin (or 0 if using first show)
        if (origin?.lat != null && origin?.lng != null) {
          distance = calculateDistance(origin.lat, origin.lng, currentLat, currentLng);
        }
      } else {
        // Calculate distance from previous show
        const prevShow = showsWithCoords[showIdx - 1];
        distance = calculateDistance(prevShow.address.lat!, prevShow.address.lng!, currentLat, currentLng);
      }

      return { ...budget, distance };
    });

    // Add destination distance if provided
    let destinationDistance = 0;
    if (destination?.lat != null && destination?.lng != null && showsWithCoords.length > 0) {
      const lastShow = showsWithCoords[showsWithCoords.length - 1];
      destinationDistance = calculateDistance(
        lastShow.address.lat!,
        lastShow.address.lng!,
        destination.lat,
        destination.lng
      );
    }

    // Update importData with new distances
    const importDataWithDistances = {
      ...importData,
      budgets: budgetsWithUpdatedDistances,
    };

    // Persist the complete tour once. The backend wraps the tour, shows and
    // budgets in a transaction, so the UI only reports success after commit.

    // Update shows with venue addresses and show types
    const updatedShows = importDataWithDistances.shows.map((show, index) => {
      const addressData = routingCoordinates[index];
      const hasExactVenue = Boolean(showAddresses[index]);
      const showType = showTypes[index] || 'show';

      const updatedShow: any = { ...show, show_type: showType };

      if (addressData) {
        updatedShow.venue_address = addressData.address;
        updatedShow.venue_lat = addressData.lat;
        updatedShow.venue_lng = addressData.lng;
        updatedShow.location_precision = hasExactVenue ? 'venue' : 'city';

        // Update venue name if we got one from Google Places
        if (hasExactVenue && addressData.name) {
          updatedShow.venueName = addressData.name;
        }
        // Update city and state if user confirmed the new location
        if (addressData.city) {
          updatedShow.city = addressData.city;
        }
        if (addressData.state) {
          updatedShow.state = addressData.state;
        }
        if (addressData.country) {
          updatedShow.country = addressData.country;
        }
      } else {
      }

      return updatedShow;
    });

    // Update budgets - clear income/outgoings for off days and travel days, and use recalculated distances
    const updatedBudgets = prepareBudgetsForImport(
      importData.shows,
      budgetsWithUpdatedDistances,
      showTypes,
      routingCoordinates
    );

    // Addresses are optional. Missing addresses must not silently remove shows.
    const updatedData: ImportData = {
      ...importData,
      shows: updatedShows,
      budgets: updatedBudgets,
      duplicatePolicy,
      tour: tourOption === 'new'
        ? {
            ...importData.tour,
            name: tourName,
            currency: effectiveCurrency,
            origin: origin || undefined,
            destination: destination || undefined,
          }
        : {
            id: selectedTourId,
            currency: effectiveCurrency,
            origin: origin || undefined,
            destination: destination || undefined,
          },
    };


    // Update state and trigger import with the updated data
    onComplete(validation!, updatedData);
    onStartImport(updatedData);
  };

  if (!validation || !importData) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-text-tertiary" />
        <p className="text-text-tertiary">Validating data...</p>
      </div>
    );
  }

  const unresolvedCityCount = uniqueImportCities.filter(city => resolvedCities[city.key]?.status !== 'resolved').length;
  const cityCoordinates = importData.shows.reduce<Record<number, RoutingCoordinate>>((all, show, index) => {
    const resolved = resolvedCities[cityKey(show)];
    if (citiesConfirmed && resolved?.status === 'resolved' && resolved.lat != null && resolved.lng != null) {
      all[index] = {
        address: resolved.label || [resolved.city, resolved.state, resolved.country].filter(Boolean).join(', '),
        lat: resolved.lat,
        lng: resolved.lng,
        city: resolved.city,
        state: resolved.state,
        country: resolved.country,
      };
    }
    return all;
  }, {});
  const routingCoordinates: Record<number, RoutingCoordinate> = { ...cityCoordinates, ...showAddresses };

  // The summary must describe the exact records that Start Import will save.
  // Venue coordinates affect routing mileage only; they must never remove shows
  // or financial data from the preview.
  const summaryShows = importData.shows;
  const performanceShows = summaryShows.filter((show, index) =>
    resolveImportedShowType(show, index, showTypes) === 'show'
  );
  const nonShowDays = summaryShows.length - performanceShows.length;
  const summaryBudgets = prepareBudgetsForImport(
    summaryShows,
    importData.budgets,
    showTypes,
    routingCoordinates
  );

  // Debug logging

  const stats = calculateImportStats(summaryBudgets, performanceShows);

  const canImport = validation.valid || validation.errors.length === 0;

  // Single Show Mode - Simple Form
  if (mode === 'add-single-show') {
    return <SingleShowForm
      existingTourId={existingTourId!}
      existingTourName={existingTourName!}
      entityId={entityId}
    />;
  }

  return (
    <div className="space-y-6">
      {/* City Mismatch Confirmation Dialog */}
      {cityMismatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="panel-dark p-8 max-w-lg w-full mx-4 shadow-xl">
            <div className="flex items-start gap-4 mb-6">
              <AlertTriangle className="h-7 w-7 text-semantic-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-xl mb-3 text-[#151713]">City Mismatch Detected</h3>
                <p className="text-sm text-[#565a52] mb-3 leading-relaxed">
                  This date shows as <strong className="text-[#151713]">{cityMismatch.csvCity}{cityMismatch.csvState ? `, ${cityMismatch.csvState}` : ''}</strong> in the system,
                  but the venue you entered is in <strong className="text-[#151713]">{cityMismatch.newCity}{cityMismatch.newState ? `, ${cityMismatch.newState}` : ''}</strong>.
                </p>
                <p className="text-sm text-[#565a52] leading-relaxed">
                  Do you want to use the new city name?
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-black/10">
              <Button
                variant="outline"
                onClick={() => handleCityMismatchConfirm(false)}
                className="w-full sm:w-auto"
              >
                Keep {cityMismatch.csvCity}{cityMismatch.csvState ? `, ${cityMismatch.csvState}` : ''}
              </Button>
              <Button
                onClick={() => handleCityMismatchConfirm(true)}
                className="w-full sm:w-auto"
              >
                Use {cityMismatch.newCity}{cityMismatch.newState ? `, ${cityMismatch.newState}` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Summary */}
      <div className="panel-dark p-6">
        <h2 className="text-xl font-semibold mb-4 text-[#151713]">Validation Results</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-semantic-success/20 rounded-lg border border-semantic-success/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-5 w-5 text-semantic-success" />
              <p className="font-semibold text-semantic-success">
                {validation.validRowCount}
              </p>
            </div>
            <p className="text-sm text-semantic-success/80">Valid Shows</p>
          </div>

          {validation.warnings.length > 0 && (
            <div className="p-4 bg-semantic-warning/20 rounded-lg border border-semantic-warning/30">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-semantic-warning" />
                <p className="font-semibold text-semantic-warning">
                  {validation.warnings.length}
                </p>
              </div>
              <p className="text-sm text-semantic-warning/80">Warnings</p>
            </div>
          )}

          {validation.errors.length > 0 && (
            <div className="p-4 bg-semantic-error/20 rounded-lg border border-semantic-error/30">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-5 w-5 text-semantic-error" />
                <p className="font-semibold text-semantic-error">
                  {validation.errors.length}
                </p>
              </div>
              <p className="text-sm text-semantic-error/80">Errors</p>
            </div>
          )}
        </div>

        {/* Errors */}
        {validation.errors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 text-semantic-error">Errors (must fix)</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {validation.errors.map((error, index) => (
                <div key={index} className="p-3 bg-semantic-error/10 border border-semantic-error/30 rounded-lg">
                  <p className="text-sm font-medium text-semantic-error">
                    Row {error.row}: {error.message}
                  </p>
                  {error.value && (
                    <p className="text-xs text-semantic-error/80 mt-1">
                      Value: {String(error.value)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 text-semantic-warning">Warnings (can proceed)</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {validation.warnings.slice(0, 5).map((warning, index) => (
                <div key={index} className="p-3 bg-semantic-warning/10 border border-semantic-warning/30 rounded-lg">
                  <p className="text-sm text-semantic-warning">
                    Row {warning.row}: {warning.message}
                  </p>
                </div>
              ))}
              {validation.warnings.length > 5 && (
                <p className="text-xs text-text-secondary">
                  ... and {validation.warnings.length - 5} more warnings
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm imported cities before asking for optional venue detail. */}
      {canImport && (
        <div className="panel-dark p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Route setup</p>
              <h2 className="mt-1 text-xl font-semibold text-[#151713]">Confirm tour cities</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Check these Google matches before SceneGen estimates the driving mileage.
              </p>
            </div>
            <Button
              onClick={() => setCitiesConfirmed(true)}
              disabled={isResolvingCities || editingCityKey !== null || unresolvedCityCount > 0 || uniqueImportCities.length === 0}
            >
              {citiesConfirmed ? <CheckCircle className="mr-2 h-4 w-4" /> : null}
              {citiesConfirmed ? 'Cities confirmed' : 'Confirm all cities'}
            </Button>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {isResolvingCities ? (
              <div className="col-span-full flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 p-4 text-sm text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking cities with Google…
              </div>
            ) : cityLookupError ? (
              <div className="col-span-full flex flex-col gap-3 rounded-xl border border-semantic-warning/30 bg-semantic-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2 text-sm text-[#151713]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-semantic-warning" />
                  <div>
                    <p className="font-medium">City check paused</p>
                    <p className="text-text-secondary">{cityLookupError}. Your imported data is still safe.</p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setCityLookupAttempt(value => value + 1)}>
                  Retry city check
                </Button>
              </div>
            ) : uniqueImportCities.map(city => {
              const match = resolvedCities[city.key];
              const isEditing = editingCityKey === city.key;
              return (
                <div key={city.key} className="rounded-xl border border-black/10 bg-white/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[#151713]">{[city.city, city.state, city.country].filter(Boolean).join(', ')}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {match?.status === 'resolved' ? `Google match: ${match.label}` : 'No reliable match found — check the CSV city/country'}
                      </p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      {match?.status === 'resolved'
                        ? <CheckCircle className="h-5 w-5 text-semantic-success" />
                        : <AlertTriangle className="h-5 w-5 text-semantic-warning" />}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCityKey(isEditing ? null : city.key);
                          setCitySearchValues(current => ({
                            ...current,
                            [city.key]: current[city.key] ?? match?.label ?? [city.city, city.state, city.country].filter(Boolean).join(', '),
                          }));
                          setCitiesConfirmed(false);
                        }}
                      >
                        {isEditing ? 'Cancel' : match?.status === 'resolved' ? 'Change' : 'Find city'}
                      </Button>
                    </div>
                  </div>
                  {isEditing && (
                    <div className="mt-3">
                      <CityAutocomplete
                        value={citySearchValues[city.key] || ''}
                        onChange={value => setCitySearchValues(current => ({ ...current, [city.key]: value }))}
                        onPlaceSelect={place => handleCityCorrection(city.key, place)}
                        placeholder={`Find the correct ${city.city}`}
                        useFullAddress
                        types={CITY_AUTOCOMPLETE_TYPES}
                        className="w-full"
                      />
                      <p className="mt-1 text-xs text-text-secondary">Choose a Google suggestion to replace this match.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {citiesConfirmed && (
            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-[#151713]">
              {isCalculatingMileage
                ? 'Calculating estimated driving mileage from the confirmed city centres…'
                : estimatedRoadMiles != null
                  ? `Estimated route: ${Math.round(estimatedRoadMiles).toLocaleString()} miles, based on confirmed city centres. Accurate mileage will be calculated as venue addresses are added.`
                  : 'Cities confirmed. SceneGen will refine the route when venue addresses are added.'}
            </div>
          )}
        </div>
      )}

      {/* Venue Addresses */}
      {canImport && effectiveCurrency && (
        <div className="panel-dark p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-[#151713]">Venue Addresses</h2>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Enter venue addresses to enable route mapping for this tour. You can skip this and add addresses later.
          </p>

          <div className="space-y-4 max-h-96 overflow-y-auto overflow-x-hidden pr-2">
            {importData.shows.map((show, index) => {
              const hasAddress = showAddresses[index];
              const hasCoordinates = hasAddress && hasAddress.lat && hasAddress.lng;
              const venueName = hasAddress?.name || show.venueName || 'Venue';
              const showType = showTypes[index] || 'show';
              const isOffDay = showType === 'off_day';
              const isTravelDay = showType === 'travel_day';
              const isRegularShow = showType === 'show';
              const isAlreadySaved = isShowAlreadySaved(show, index);
              const isEditable = editableShows[index] || false;

              return (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${
                    isAlreadySaved && !isEditable ? 'bg-surface-elevated/50 border-border-subtle' :
                    isOffDay ? 'bg-accent-blue/10 border-accent-blue/30' :
                    isTravelDay ? 'bg-accent-purple/10 border-accent-purple/30' :
                    hasCoordinates ? 'bg-semantic-success/10 border-semantic-success/30' : 'bg-white/70 border-black/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#151713]">
                          {isOffDay ? 'Off Day' : isTravelDay ? 'Travel Day' : venueName}
                        </p>
                        {(isOffDay || isTravelDay) && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 text-[#565a52]">
                            {isOffDay ? <Coffee className="h-3 w-3 inline mr-1" /> : <Plane className="h-3 w-3 inline mr-1" />}
                            {isOffDay ? 'Day Off' : 'Travel'}
                          </span>
                        )}
                        {isAlreadySaved && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-semantic-success/20 text-semantic-success border border-semantic-success/30">
                            Already Saved
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">
                        {(isOffDay || isTravelDay) ? (
                          // For off days and travel days, show date only
                          formatDate(show.date, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        ) : (
                          // For regular shows, show city, state, and date
                          <>
                            {show.city}{show.state ? `, ${show.state}` : ''} • {formatDate(show.date, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </>
                        )}
                      </p>
                    </div>
                    {hasCoordinates && isRegularShow && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-semantic-success" />
                        <span className="text-xs text-semantic-success">Verified</span>
                      </div>
                    )}
                  </div>

                  {isRegularShow && (
                    <>
                      {isAlreadySaved && !isEditable ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-surface-elevated/30 border border-border-subtle rounded-lg">
                            <p className="text-sm text-text-secondary">
                              {showAddresses[index]?.address || 'No address saved'}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleEdit(index)}
                            className="w-full text-xs"
                          >
                            Edit Address
                          </Button>
                        </div>
                      ) : (
                        <>
                          <PlacesAutocomplete
                            value={showAddresses[index]?.address || ''}
                            onChange={(address, lat, lng, name, city, state, country) => handleAddressChange(index, address, lat, lng, name, city, state, country)}
                            placeholder={venueName && venueName !== 'Venue TBC'
                              ? `Search for ${venueName} in ${show.city}`
                              : `Type a venue name in ${show.city}`}
                            searchCity={show.city}
                            searchState={show.state}
                            searchCountry={show.country}
                          />

                          {isAlreadySaved && isEditable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleEdit(index)}
                              className="w-full text-xs mt-2"
                            >
                              Cancel Edit
                            </Button>
                          )}
                        </>
                      )}

                      {!isAlreadySaved && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowTypeChange(index, 'off_day')}
                            className="flex-1 text-xs"
                          >
                            <Coffee className="h-3 w-3 mr-1" />
                            Mark as Off Day
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowTypeChange(index, 'travel_day')}
                            className="flex-1 text-xs"
                          >
                            <Plane className="h-3 w-3 mr-1" />
                            Mark as Travel Day
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {(isOffDay || isTravelDay) && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-text-tertiary mb-2">
                        {isOffDay ? 'Day off — only fuel and hotel costs will be included' : 'Travel day — only fuel and hotel costs will be included'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowTypeChange(index, 'show')}
                        className="w-full text-xs"
                      >
                        Change Back to Regular Show
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t text-sm text-text-tertiary">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {(() => {
                  // Count only regular shows (not off days or travel days)
                  let totalRegularShows = 0;
                  let regularShowsWithCoords = 0;

                  importData.shows.forEach((_, idx) => {
                    const type = showTypes[idx] || 'show';
                    if (type === 'show') {
                      totalRegularShows++;
                      const addr = showAddresses[idx];
                      if (addr && addr.lat && addr.lng) {
                        regularShowsWithCoords++;
                      }
                    }
                  });

                  return `${regularShowsWithCoords} of ${totalRegularShows} venues have valid coordinates`;
                })()}
              </span>
            </p>
            {Object.keys(showAddresses).length > 0 && Object.values(showAddresses).filter(addr => addr.lat && addr.lng).length === 0 && (
              <p className="text-semantic-warning text-xs mt-2">
                Please select addresses from the dropdown suggestions to confirm their map coordinates.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tour Selection */}
      {canImport && (
        <div className="panel-dark p-6">
          <h2 className="text-xl font-semibold mb-4 text-[#151713]">Tour Settings</h2>

          <div className="space-y-4">
            {/* Create New Tour */}
            <div className="flex items-start space-x-3 p-4 border border-black/10 rounded-lg bg-white/70">
              <input
                type="radio"
                id="new-tour"
                name="tour-option"
                value="new"
                checked={tourOption === 'new'}
                onChange={() => setTourOption('new')}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="new-tour" className="font-medium cursor-pointer text-[#151713]">
                  Create New Tour
                </label>
                {tourOption === 'new' && (
                  <div className="mt-3">
                    <label htmlFor="tour-name" className="text-sm block mb-1 text-[#565a52]">Tour Name</label>
                    <input
                      id="tour-name"
                      type="text"
                      value={tourName}
                      onChange={(e) => setTourName(e.target.value)}
                      placeholder="e.g., USA Spring 2026"
                      className="w-full px-3 py-2 border border-black/10 rounded-md bg-white/70 text-[#151713] placeholder:text-text-muted"
                    />
                    {importData.tour?.startDate && (
                      <p className="text-xs text-text-secondary mt-2">
                        {formatDate(importData.tour.startDate)} - {' '}
                        {importData.tour.endDate && formatDate(importData.tour.endDate)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Add to Existing Tour */}
            <div className="flex items-start space-x-3 p-4 border border-black/10 rounded-lg bg-white/70">
              <input
                type="radio"
                id="existing-tour"
                name="tour-option"
                value="existing"
                checked={tourOption === 'existing'}
                onChange={() => setTourOption('existing')}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="existing-tour" className="font-medium cursor-pointer">
                  Add to Existing Tour
                </label>
                {tourOption === 'existing' && (
                  <div className="mt-3">
                    {isLoadingTours ? (
                      <p className="text-sm text-text-tertiary">Loading tours...</p>
                    ) : existingTours.length === 0 ? (
                      <p className="text-sm text-text-tertiary">No existing tours found</p>
                    ) : (
                      <select
                        value={selectedTourId}
                        onChange={(e) => setSelectedTourId(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        {existingTours.map((tour) => (
                          <option key={tour.id} value={tour.id}>
                            {tour.name || tour.tourName} ({formatDate(tour.startDate)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Currency Confirmation */}
      {canImport && mode !== 'add-single-show' && (
        <div className="panel-dark p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff563d]">
                Financial settings
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#151713]">Confirm import currency</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#565a52]">
                {currencyDetection?.totalCurrencyCells
                  ? `SceneGen detected ${currencyDetection.currency} in ${currencyDetection.matches} of ${currencyDetection.totalCurrencyCells} mapped currency cells.`
                  : 'SceneGen could not find a currency symbol in the mapped financial columns.'}
                {' '}Choose the currency these tour budgets should use, then confirm it below.
              </p>
            </div>

            <div className="w-full md:w-72">
              <label htmlFor="import-currency" className="mb-2 block text-sm font-medium text-[#151713]">
                Tour currency
              </label>
              <select
                id="import-currency"
                value={effectiveCurrency}
                onChange={(event) => {
                  setSelectedCurrency(event.target.value);
                  setCurrencyConfirmed(false);
                }}
                className="w-full rounded-md border border-black/15 bg-white px-3 py-2.5 text-[#151713]"
              >
                <option value="" disabled>Select a currency</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British pound (£)</option>
                <option value="USD">USD — US dollar ($)</option>
                <option value="CAD">CAD — Canadian dollar (C$)</option>
                <option value="AUD">AUD — Australian dollar (A$)</option>
                <option value="NZD">NZD — New Zealand dollar (NZ$)</option>
                <option value="JPY">JPY — Japanese yen (¥)</option>
                <option value="CHF">CHF — Swiss franc</option>
                <option value="SEK">SEK — Swedish krona</option>
                <option value="NOK">NOK — Norwegian krone</option>
                <option value="DKK">DKK — Danish krone</option>
                <option value="PLN">PLN — Polish złoty</option>
                <option value="CZK">CZK — Czech koruna</option>
              </select>
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 bg-white/70 p-4">
            <input
              type="checkbox"
              checked={currencyConfirmed}
              disabled={!effectiveCurrency}
              onChange={(event) => setCurrencyConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#ff563d]"
            />
            <span className="text-sm text-[#151713]">
              I confirm that this import should be saved in <strong>{effectiveCurrency || 'the selected currency'}</strong>.
            </span>
          </label>
        </div>
      )}

      {/* Financial Summary */}
      {canImport && (
        <div className="panel-dark p-6">
          <h2 className="text-xl font-semibold mb-4 text-[#151713]">Import Summary</h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-text-secondary">Shows</p>
              <p className="text-2xl font-bold text-[#151713]">{performanceShows.length}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Revenue</p>
              <p className="text-2xl font-bold text-semantic-success">
                {formatCurrency(stats.totalRevenue, effectiveCurrency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Expenses</p>
              <p className="text-2xl font-bold text-semantic-warning">
                {formatCurrency(stats.totalExpenses, effectiveCurrency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Profit</p>
              <p className="text-2xl font-bold text-[#151713]">
                {formatCurrency(stats.profit, effectiveCurrency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">{estimatedRoadMiles != null ? 'Estimated Miles' : 'Miles'}</p>
              <p className="text-2xl font-bold text-primary">
                {isCalculatingMileage ? '…' : Math.round(estimatedRoadMiles ?? stats.totalMiles).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-black/10 text-sm text-text-secondary">
            <p>• {summaryShows.length} schedule days ({performanceShows.length} shows, {nonShowDays} off/travel days)</p>
            <p>• {summaryBudgets.length} budgets will be created</p>
            <p>• {stats.totalLineItems} expense/revenue line items</p>
            <p>• Average fees per show: {formatCurrency(stats.averageFeesPerShow, effectiveCurrency)}</p>
            {estimatedRoadMiles != null && (
              <p>• Mileage uses confirmed city centres and will become more accurate as venue addresses are added</p>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-black/10 bg-white/70 p-4">
            <p className="font-medium text-[#151713]">Duplicate protection</p>
            <p className="mt-1 text-sm text-text-secondary">{isCheckingDuplicates ? 'Checking this workspace…' : duplicateCount ? `${duplicateCount} date and city match${duplicateCount === 1 ? 'es' : ''} already in SceneGen.` : 'No matching dates and cities found in this workspace.'}</p>
            {duplicateCount > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer gap-2 rounded-lg border border-black/10 bg-white p-3 text-sm"><input type="radio" name="duplicate-policy" checked={duplicatePolicy === 'skip'} onChange={() => setDuplicatePolicy('skip')} />Skip existing dates <span className="text-text-muted">(recommended)</span></label>
              <label className="flex cursor-pointer gap-2 rounded-lg border border-black/10 bg-white p-3 text-sm"><input type="radio" name="duplicate-policy" checked={duplicatePolicy === 'import_anyway'} onChange={() => setDuplicatePolicy('import_anyway')} />Import them again</label>
            </div>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex gap-3">
          <Button
            onClick={handleStartImport}
            disabled={!canImport || !citiesConfirmed || !effectiveCurrency || !currencyConfirmed || (tourOption === 'new' && !tourName.trim())}
            size="lg"
          >
            {!canImport ? 'Fix Errors to Continue' : !citiesConfirmed ? 'Confirm Cities to Continue' : !currencyConfirmed ? 'Confirm Currency to Continue' : 'Start Import'}
          </Button>
        </div>
      </div>

      {/* Tour Origin/Destination Modal */}
      {showOriginDestinationModal && importData && importData.shows.length > 0 && (
        <TourOriginDestinationModal
          open={showOriginDestinationModal}
          onConfirm={handleOriginDestinationConfirm}
          onCancel={handleOriginDestinationCancel}
          firstShow={{
            city: showAddresses[0]?.city || importData.shows[0].city,
            state: showAddresses[0]?.state || importData.shows[0].state || '',
            lat: showAddresses[0]?.lat,
            lng: showAddresses[0]?.lng,
          }}
          lastShow={{
            city: showAddresses[importData.shows.length - 1]?.city || importData.shows[importData.shows.length - 1].city,
            state: showAddresses[importData.shows.length - 1]?.state || importData.shows[importData.shows.length - 1].state || '',
            lat: showAddresses[importData.shows.length - 1]?.lat,
            lng: showAddresses[importData.shows.length - 1]?.lng,
          }}
        />
      )}
    </div>
  );
}
