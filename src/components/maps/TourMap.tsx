'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, OverlayView } from '@react-google-maps/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LocateFixed, Lock, MapPin, Move } from 'lucide-react';
import { Show, segmentRoute, getSegmentColor, calculateTotalDistance, getMapBounds, getShowsWithCoordinates, convertShowForMap } from '@/lib/maps/routeUtils';
import type { Show as AppShow } from '@/types/show';
import { MarkerTooltip } from './MarkerTooltip';

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 39.8283, // Center of USA
  lng: -98.5795,
};

interface TourMapProps {
  shows: AppShow[];
  totalMiles?: number; // Optional: use database total instead of calculating
  startDate?: string;
  endDate?: string;
  currency?: string;
}

type CityCandidate = {
  lat: number;
  lng: number;
  label: string;
};

const isUsableTourCity = (city?: string) => {
  const value = city?.trim().toLocaleLowerCase();
  return Boolean(value && !['off', 'off day', 'travel', 'travel day', 'tbd', 'n/a'].includes(value));
};

export function TourMap({ shows, totalMiles, startDate, endDate, currency }: TourMapProps) {
  const router = useRouter();
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hoveredShow, setHoveredShow] = useState<Show | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [routes, setRoutes] = useState<google.maps.DirectionsResult[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [routeError, setRouteError] = useState<string>('');
  const mapRef = useRef<google.maps.Map | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [cityCoordinates, setCityCoordinates] = useState<Record<string, { lat: number; lng: number }>>({});
  const [cityCandidates, setCityCandidates] = useState<Record<string, CityCandidate>>({});
  const [citiesConfirmed, setCitiesConfirmed] = useState(false);
  const [isResolvingCities, setIsResolvingCities] = useState(false);
  const [cityResolutionError, setCityResolutionError] = useState('');
  const [exploreMode, setExploreMode] = useState(false);

  // Master animation clock (0 to 1, loops every 3 seconds)
  const [t, setT] = useState(0);

  const mapShows = useMemo(() => shows.map((show) => ({
    ...convertShowForMap(show),
    currency: currency || show.currency,
  })), [shows, currency]);

  const mapOptions = useMemo<google.maps.MapOptions>(() => ({
    disableDefaultUI: !exploreMode,
    zoomControl: exploreMode,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    draggable: exploreMode,
    scrollwheel: exploreMode,
    keyboardShortcuts: exploreMode,
    disableDoubleClickZoom: !exploreMode,
    gestureHandling: exploreMode ? 'greedy' : 'none',
  }), [exploreMode]);

  const locationLookupKey = useMemo(() => JSON.stringify(mapShows.map((show) => [
    show.id,
    show.city,
    show.state,
    show.country,
    show.venue_lat,
    show.venue_lng,
  ])), [mapShows]);

  // Resolve city centres only for dates that do not yet have exact venue
  // coordinates. These coordinates are for routing display and are not saved
  // back as a confirmed venue location.
  useEffect(() => {
    if (!isLoaded) return;

    const unresolved = mapShows.filter((show) =>
      !getShowsWithCoordinates([show]).length && isUsableTourCity(show.city)
    );

    if (unresolved.length === 0) {
      setCityCoordinates({});
      setCityCandidates({});
      setCitiesConfirmed(true);
      setCityResolutionError('');
      setIsResolvingCities(false);
      return;
    }

    let cancelled = false;
    const placesService = new google.maps.places.PlacesService(document.createElement('div'));

    const locateCity = (query: string) => new Promise<google.maps.places.PlaceResult | null>((resolve) => {
      placesService.findPlaceFromQuery({ query, fields: ['geometry', 'formatted_address', 'name'] }, (results, status) => {
        resolve(status === google.maps.places.PlacesServiceStatus.OK && results?.[0] ? results[0] : null);
      });
    });

    const resolveCities = async () => {
      setIsResolvingCities(true);
      setCitiesConfirmed(false);
      setCityResolutionError('');
      const proposed: Record<string, CityCandidate> = {};
      const queryCache = new Map<string, CityCandidate | null>();

      for (const show of unresolved) {
        if (cancelled) return;
        // Try the most specific description first, but fall back to the city
        // itself when legacy country data is wrong (for example Brussels/USA).
        const queries = [
          [show.city, show.state, show.country].filter(Boolean).join(', '),
          [show.city, show.state].filter(Boolean).join(', '),
          show.city?.trim() ?? '',
        ].filter((query, index, all) => Boolean(query) && all.indexOf(query) === index);
        const cacheKey = queries.join('|').toLocaleLowerCase();
        let candidate = queryCache.get(cacheKey);

        if (candidate === undefined) {
          candidate = null;
          for (const query of queries) {
            const result = await locateCity(query);
            const location = result?.geometry?.location;
            if (location) {
              candidate = {
                lat: location.lat(),
                lng: location.lng(),
                label: result.formatted_address || result.name || query,
              };
              break;
            }
          }
          queryCache.set(cacheKey, candidate);
        }

        if (candidate) proposed[show.id] = candidate;
      }

      if (!cancelled) {
        setCityCandidates(proposed);
        setCityCoordinates({});
        setIsResolvingCities(false);
        if (Object.keys(proposed).length === 0) {
          setCityResolutionError('SceneGen could not locate the tour cities. Check that each performance date has a real city name.');
        }
      }
    };

    resolveCities().catch(() => {
      if (!cancelled) {
        setIsResolvingCities(false);
        setCityResolutionError('SceneGen could not locate the cities on this tour.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, locationLookupKey]);

  const confirmCityCandidates = useCallback(() => {
    const confirmed = Object.fromEntries(
      Object.entries(cityCandidates).map(([showId, candidate]) => [
        showId,
        { lat: candidate.lat, lng: candidate.lng },
      ])
    );
    setCityCoordinates(confirmed);
    setCitiesConfirmed(true);
  }, [cityCandidates]);

  // Prefer venue coordinates and fall back to a city centre. The precision
  // marker keeps the UI honest about which kind of location is displayed.
  const validShows = useMemo(() => {
    return getShowsWithCoordinates(mapShows.map((show) => {
      if (getShowsWithCoordinates([show]).length) return show;
      const fallback = cityCoordinates[show.id];
      return fallback ? {
        ...show,
        venue_lat: fallback.lat,
        venue_lng: fallback.lng,
        venue_address: [show.city, show.state, show.country].filter(Boolean).join(', '),
        location_precision: 'city' as const,
      } : show;
    }));
  }, [mapShows, cityCoordinates]);

  const approximateStopCount = useMemo(
    () => validShows.filter((show) => show.location_precision === 'city').length,
    [validShows]
  );

  const validCoordinateKey = useMemo(
    () => validShows.map((show) => `${show.id}:${show.venue_lat}:${show.venue_lng}`).join('|'),
    [validShows]
  );

  const segments = useMemo(() => segmentRoute(validShows), [validShows]);

  // Keep a ref to validShows to use in stable callbacks
  const validShowsRef = useRef(validShows);

  // Update ref when validShows changes
  useEffect(() => {
    validShowsRef.current = validShows;
  }, [validShows]);

  // Log only when shows prop changes, not on every render
  useEffect(() => {
    console.log('🗺️ TourMap: Shows prop changed, now have', shows.length, 'shows');
  }, [shows.length]);

  // Helper function to check if a show is today
  const isShowToday = useCallback((show: Show): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parse the show date and normalize it
    const showDate = new Date(show.date);
    showDate.setHours(0, 0, 0, 0);

    const isToday = showDate.getTime() === today.getTime();

    return isToday;
  }, []);

  // Find today's show - memoize to prevent re-calculation on every render
  const todayShow = useMemo(() => validShows.find(isShowToday), [validShows, isShowToday]);

  // Find today's show index in the route
  const todayShowIndex = useMemo(() =>
    todayShow ? validShows.findIndex(s => s.id === todayShow.id) : -1,
    [validShows, todayShow]
  );

  // Master animation driver - runs at 60fps, loops every 3 seconds
  useEffect(() => {
    if (!todayShow) return;

    let animationFrameId: number;
    const duration = 6000; // 6 seconds per cycle (slower)
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration; // 0 to 1, loops

      setT(progress);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [todayShow]);

  // Derived animation values
  const pulse = useMemo(() => {
    // Sine wave: 0 -> 1 -> 0 over the cycle
    return Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  }, [t]);

  const easedPulse = useMemo(() => {
    // Ease-in-out for smoother animation
    return pulse < 0.5
      ? 2 * pulse * pulse
      : 1 - Math.pow(-2 * pulse + 2, 2) / 2;
  }, [pulse]);

  // Debug logging - only run once when component mounts or when validShows length changes
  useEffect(() => {
    const today = new Date();
    console.log('=== TOUR MAP DEBUG ===');
    console.log('🗓️ Today\'s date:', today.toISOString().split('T')[0]);
    console.log('🗓️ Today (local):', today.toLocaleDateString());
    console.log('🎯 Valid shows count:', validShows.length);
    console.log('🎪 Today\'s show found:', todayShow ? `${todayShow.venue_name} on ${todayShow.date}` : 'NONE');
    if (validShows.length > 0 && validShows.length < 50) {
      console.log('📅 All show dates:', validShows.slice(0, 10).map(s => `${s.venue_name}: ${s.date}`));
    }
    console.log('=====================');
  }, [validShows.length]); // Only log when the number of shows changes

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    mapRef.current = map;

    // Immediately fit bounds when map loads if we have valid shows
    const shows = validShowsRef.current;
    if (shows.length > 0) {
      const bounds = getMapBounds(shows);
      if (bounds) {
        // Use setTimeout to ensure map is fully initialized
        setTimeout(() => {
          map.fitBounds(bounds, {
            top: 80,
            right: 80,
            bottom: 80,
            left: 80,
          });
        }, 100);
      }
    }
  }, []); // No dependencies - use ref inside

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const frameRoute = useCallback(() => {
    if (!mapRef.current || validShowsRef.current.length === 0) return;
    const bounds = getMapBounds(validShowsRef.current);
    if (!bounds) return;
    mapRef.current.fitBounds(bounds, { top: 72, right: 72, bottom: 72, left: 72 });
  }, []);

  // Load route segments
  useEffect(() => {
    if (!map || validShows.length < 2) {
      setRoutes([]);
      setTotalDistance(0);
      return;
    }

    const loadRoutes = async () => {
      setIsLoadingRoutes(true);
      setRouteError('');
      const directionsService = new google.maps.DirectionsService();
      const loadedRoutes: google.maps.DirectionsResult[] = [];

      try {
        for (const segment of segments) {
          if (segment.shows.length < 2) continue;

          const origin = {
            lat: segment.shows[0].venue_lat!,
            lng: segment.shows[0].venue_lng!,
          };

          const destination = {
            lat: segment.shows[segment.shows.length - 1].venue_lat!,
            lng: segment.shows[segment.shows.length - 1].venue_lng!,
          };

          const waypoints = segment.shows.slice(1, -1).map(show => ({
            location: { lat: show.venue_lat!, lng: show.venue_lng! },
            stopover: true,
          }));

          console.log('🗺️ Requesting route with:', {
            origin,
            destination,
            waypointCount: waypoints.length,
            waypoints,
          });

          const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
            directionsService.route(
              {
                origin,
                destination,
                waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: false, // Keep shows in chronological order
              },
              (result, status) => {
                console.log('🗺️ Directions API response:', { status, result });

                if (status === 'OK' && result) {
                  resolve(result);
                } else {
                  const errorMessage = `Directions request failed: ${status}`;
                  console.error('❌ Directions API Error:', {
                    status,
                    origin,
                    destination,
                    waypointCount: waypoints.length,
                    result,
                    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.substring(0, 20) + '...',
                  });

                  // Provide helpful error messages
                  if (status === 'REQUEST_DENIED') {
                    console.error('💡 REQUEST_DENIED usually means:');
                    console.error('   1. Directions API not enabled in Google Cloud Console');
                    console.error('   2. API key restrictions blocking localhost');
                    console.error('   3. Billing not enabled (even with free tier)');
                    console.error('   4. API key missing required APIs');
                    console.error('   ');
                    console.error('   Check: https://console.cloud.google.com/google/maps-apis/api-list');
                  }

                  reject(new Error(errorMessage));
                }
              }
            );
          });

          loadedRoutes.push(result);

          // Small delay to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        setRoutes(loadedRoutes);
        setTotalDistance(calculateTotalDistance(loadedRoutes));
        console.log('✅ Successfully loaded', loadedRoutes.length, 'route segments');
      } catch (error: any) {
        console.error('❌ Error loading routes:', error);
        setRouteError(error.message || 'Failed to load route. Check console for details.');
      } finally {
        setIsLoadingRoutes(false);
      }
    };

    loadRoutes();
  }, [map, validCoordinateKey]);

  // Fit bounds to show all markers (also re-fit after routes load)
  useEffect(() => {
    if (!map || validShows.length === 0) return;

    const bounds = getMapBounds(validShows);
    if (bounds) {
      // Add padding to ensure all markers are visible
      map.fitBounds(bounds, {
        top: 80,
        right: 80,
        bottom: 80,
        left: 80,
      });
    }
  }, [map, validCoordinateKey, routes.length]);

  // Calculate distance to next show
  const getDistanceToNextShow = (currentIndex: number): number | undefined => {
    if (currentIndex >= validShows.length - 1) return undefined;

    // Try to find distance from routes
    for (const route of routes) {
      if (!route.routes?.[0]?.legs) continue;

      const legs = route.routes[0].legs;

      // Check each leg to find one that starts from our current show
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        // We need to match by checking if this leg connects our current show to the next
        // Since we can't easily match, let's use the index within the segment
        if (i === currentIndex && leg.distance?.value) {
          return leg.distance.value;
        }
      }
    }

    // If we have multiple route segments, calculate across segments
    if (routes.length > 0) {
      // Find which segment contains our current show
      let accumulatedShows = 0;
      for (const segment of segments) {
        const segmentSize = segment.shows.length;
        if (currentIndex < accumulatedShows + segmentSize - 1) {
          // Current show is in this segment
          const indexInSegment = currentIndex - accumulatedShows;
          const correspondingRoute = routes[segments.indexOf(segment)];
          if (correspondingRoute?.routes?.[0]?.legs?.[indexInSegment]) {
            return correspondingRoute.routes[0].legs[indexInSegment].distance?.value;
          }
          break;
        }
        // Account for segment overlap
        accumulatedShows += segmentSize - 1;
      }
    }

    return undefined;
  };

  // Get next show information
  const getNextShowInfo = (currentIndex: number): { venue: string; city: string; state: string } | undefined => {
    if (currentIndex >= validShows.length - 1) return undefined;

    const nextShow = validShows[currentIndex + 1];
    return {
      venue: nextShow.venue_name || nextShow.city || 'Location TBC',
      city: nextShow.city || '',
      state: nextShow.state || '',
    };
  };

  // Convert lat/lng to pixel position on screen
  const getPixelPosition = (lat: number, lng: number): { x: number; y: number } | null => {
    if (!mapRef.current) return null;

    const projection = mapRef.current.getProjection();
    if (!projection) return null;

    const bounds = mapRef.current.getBounds();
    if (!bounds) return null;

    const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
    const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
    const point = projection.fromLatLngToPoint(new google.maps.LatLng(lat, lng));

    if (!topRight || !bottomLeft || !point) return null;

    const scale = Math.pow(2, mapRef.current.getZoom() || 0);

    return {
      x: (point.x - bottomLeft.x) * scale,
      y: (point.y - topRight.y) * scale,
    };
  };

  // Handle marker hover with custom positioning
  const handleMarkerMouseOver = (show: Show) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    const pos = getPixelPosition(show.venue_lat!, show.venue_lng!);
    setHoveredShow(show);
    setTooltipPosition(pos);
  };

  // Get smart tooltip transform based on position
  const getTooltipTransform = (position: { x: number; y: number } | null): string => {
    if (!position) return 'translate(5%, -50%)';

    // Approximate tooltip height
    const tooltipHeight = 400;
    const minBottomBuffer = 50; // Minimum space from bottom edge

    // Get map container dimensions
    const mapContainer = document.querySelector('.gm-style');
    const containerHeight = mapContainer?.clientHeight || window.innerHeight;

    // Check if tooltip would clip at bottom
    const wouldClipBottom = (position.y + tooltipHeight / 2) > (containerHeight - minBottomBuffer);

    // Check if tooltip would clip at top
    const wouldClipTop = (position.y - tooltipHeight / 2) < 50;

    if (wouldClipBottom && !wouldClipTop) {
      // Near bottom: shift up to avoid clipping
      const offsetPercent = -80; // Move tooltip up
      return `translate(5%, ${offsetPercent}%)`;
    } else if (wouldClipTop && !wouldClipBottom) {
      // Near top: shift down to avoid clipping
      const offsetPercent = -20; // Move tooltip down
      return `translate(5%, ${offsetPercent}%)`;
    } else {
      // Middle of map: center vertically
      return 'translate(5%, -50%)';
    }
  };

  const handleMarkerMouseOut = () => {
    // Delay closing to allow mouse to move to tooltip
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredShow(null);
      setTooltipPosition(null);
    }, 200);
  };

  const handleTooltipMouseEnter = () => {
    // Cancel close if mouse enters tooltip
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    // Close when mouse leaves tooltip
    setHoveredShow(null);
    setTooltipPosition(null);
  };

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading Google Maps: {loadError.message}. Please check your API key configuration.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-tertiary">Loading map...</p>
      </div>
    );
  }

  if (isResolvingCities && validShows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-tertiary">Locating tour cities...</p>
      </div>
    );
  }

  if (!citiesConfirmed && Object.keys(cityCandidates).length > 0) {
    const uniqueCandidates = Array.from(new Map<string, { city?: string; label: string }>(
      mapShows
        .filter((show) => cityCandidates[show.id])
        .map((show) => {
          const candidate = cityCandidates[show.id];
          return [`${show.city}|${candidate.label}`, { city: show.city, label: candidate.label }] as const;
        })
    ).values());

    return (
      <div className="h-full p-6 md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border-subtle bg-surface-elevated p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">City-level routing</p>
          <h3 className="mt-2 text-2xl font-bold text-foreground">Confirm the tour cities</h3>
          <p className="mt-2 text-sm text-text-secondary">
            These are approximate city centres, not confirmed venues. Check each proposed location before SceneGen builds the route.
          </p>
          <div className="mt-6 divide-y divide-border-subtle rounded-xl border border-border-subtle bg-background">
            {uniqueCandidates.map(({ city, label }) => (
              <div key={`${city}-${label}`} className="grid gap-1 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-6">
                <p className="font-semibold text-foreground">{city}</p>
                <p className="text-sm text-text-secondary sm:text-right">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-text-tertiary">
            If a result is wrong, correct the city on that tour date before confirming. SceneGen will never save these city-centre coordinates as a venue.
          </p>
          <button
            type="button"
            onClick={confirmCityCandidates}
            className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Confirm cities and build route
          </button>
        </div>
      </div>
    );
  }

  if (validShows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <MapPin className="h-12 w-12 text-text-tertiary" />
        <div className="text-center">
          <p className="font-semibold">No tour locations available</p>
          <p className="text-sm text-text-tertiary">
            Add a city to each performance date to display the route
          </p>
          {cityResolutionError && <p className="text-sm text-semantic-error mt-2">{cityResolutionError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        {exploreMode && (
          <button type="button" onClick={frameRoute} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-subtle bg-background/95 px-3 text-xs font-black shadow-md backdrop-blur" aria-label="Frame the whole route">
            <LocateFixed size={15} />
            <span className="hidden sm:inline">Frame route</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setExploreMode((enabled) => !enabled)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-subtle bg-background/95 px-4 text-xs font-black shadow-md backdrop-blur"
          aria-pressed={exploreMode}
        >
          {exploreMode ? <Lock size={15} /> : <Move size={15} />}
          {exploreMode ? 'Lock map' : 'Explore map'}
        </button>
      </div>
      {approximateStopCount > 0 && (
        <div className="absolute right-4 top-16 z-10 max-w-md rounded-lg border border-border-subtle bg-background/95 px-4 py-2 shadow-md backdrop-blur">
          <p className="text-sm font-medium">Routing via {approximateStopCount} city {approximateStopCount === 1 ? 'location' : 'locations'}</p>
          <p className="text-xs text-text-tertiary">Those markers are approximate until their venues are confirmed.</p>
        </div>
      )}
      {/* Error Alert */}
      {routeError && (
        <Alert variant="destructive" className="absolute top-4 left-4 right-4 z-10 bg-semantic-error/95 backdrop-blur">
          <AlertDescription>
            <strong>Route Error:</strong> {routeError}
            <br />
            <span className="text-xs mt-2 block">
              This usually means the Directions API or Geocoding API is not enabled in Google Cloud Console.
              Check the browser console for detailed error information.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Map Container with relative positioning */}
      <div className="relative h-full w-full overflow-hidden">
        {/* Map */}
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          options={mapOptions}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
        {/* Show Markers */}
        {validShows.map((show, index) => {
          const isToday = todayShow && show.id === todayShow.id;

          return (
            <Marker
              key={show.id}
              position={{
                lat: show.venue_lat!,
                lng: show.venue_lng!,
              }}
              label={{
                text: `${index + 1}`,
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
              onMouseOver={() => handleMarkerMouseOver(show)}
              onMouseOut={handleMarkerMouseOut}
              onClick={() => router.push(`/shows/${show.id}`)}
              zIndex={isToday ? 1000 : undefined}
            />
          );
        })}

        {/* Animated Waypoint Marker for Today's Show */}
        {todayShow && (
          <OverlayView
            position={{
              lat: todayShow.venue_lat!,
              lng: todayShow.venue_lng!,
            }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              style={{
                position: 'absolute',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            >
              {/* Outer ripple */}
              <svg
                width="80"
                height="80"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <circle
                  cx="40"
                  cy="40"
                  r={20 + easedPulse * 20}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  opacity={0.6 - easedPulse * 0.4}
                />
              </svg>

              {/* Inner ripple */}
              <svg
                width="60"
                height="60"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <circle
                  cx="30"
                  cy="30"
                  r={15 + easedPulse * 10}
                  fill="#06b6d4"
                  fillOpacity={0.3 - easedPulse * 0.2}
                />
              </svg>
            </div>
          </OverlayView>
        )}

        {/* Route Segments */}
        {routes.map((route, index) => (
          <DirectionsRenderer
            key={`route-${index}`}
            directions={route}
            options={{
              suppressMarkers: true, // We're showing our own markers
              preserveViewport: true, // Prevent Google Maps from overriding our fitBounds
              polylineOptions: {
                strokeColor: getSegmentColor(index),
                strokeWeight: 4,
                strokeOpacity: 0.7,
              },
            }}
          />
        ))}
      </GoogleMap>

      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2">
        <span className="rounded-full border border-border-subtle bg-background/92 px-3 py-2 text-xs font-black shadow-sm backdrop-blur">{validShows.length} mapped stops</span>
        <span className="rounded-full border border-border-subtle bg-background/92 px-3 py-2 text-xs font-black shadow-sm backdrop-blur">{Math.round(totalMiles && totalMiles > 0 ? totalMiles : totalDistance).toLocaleString()} mi</span>
        {startDate && endDate && <span className="hidden rounded-full border border-border-subtle bg-background/92 px-3 py-2 text-xs font-bold shadow-sm backdrop-blur sm:inline">{new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
      </div>

      {/* Custom Hover Tooltip Overlay */}
      {hoveredShow && tooltipPosition && (
        <div
          style={{
            position: 'absolute',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: getTooltipTransform(tooltipPosition), // Smart positioning based on edges
            zIndex: 9999,
            pointerEvents: 'auto',
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          {(() => {
            const currentIndex = validShows.findIndex(s => s.id === hoveredShow.id);
            const nextShowInfo = getNextShowInfo(currentIndex);
            return (
              <MarkerTooltip
                venueName={hoveredShow.venue_name}
                venueAddress={hoveredShow.venue_address || ''}
                city={hoveredShow.city}
                state={hoveredShow.state}
                country={hoveredShow.country}
                locationPrecision={hoveredShow.location_precision}
                fee={hoveredShow.fee}
                currency={hoveredShow.currency}
                distanceToNext={getDistanceToNextShow(currentIndex)}
                lat={hoveredShow.venue_lat!}
                lng={hoveredShow.venue_lng!}
                venueCapacity={hoveredShow.venue_capacity}
                nextShowVenue={nextShowInfo?.venue}
                nextShowCity={nextShowInfo?.city}
                nextShowState={nextShowInfo?.state}
              />
            );
          })()}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoadingRoutes && (
        <div className="absolute bottom-4 right-4 z-10 bg-background/95 backdrop-blur px-4 py-2 rounded-lg shadow-md">
          <p className="text-sm text-text-tertiary">Loading route...</p>
        </div>
      )}
    </div>
    {/* End Map Container */}

    </div>
  );
}
