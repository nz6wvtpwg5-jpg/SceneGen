// Google Maps utility functions for tour route visualization
import type { Show as AppShow } from '@/types/show';

export interface Show {
  id: string;
  date: string;
  venue_name: string;
  venue_address?: string | null;
  venue_lat?: number | null;
  venue_lng?: number | null;
  city?: string;
  state?: string;
  country?: string;
  location_precision?: 'venue' | 'city';
  fee: number;
  currency?: string;
  venue_capacity?: number | null;
}

/**
 * Convert application Show type to Map Show type
 */
export function convertShowForMap(show: AppShow): Show {
  // Check all possible lat/lng field names
  let lat = (show as any).venue_lat
    ?? (show as any).venueLat
    ?? (show as any).latitude
    ?? (show as any).lat;

  let lng = (show as any).venue_lng
    ?? (show as any).venueLng
    ?? (show as any).longitude
    ?? (show as any).lng;

  // Ensure coordinates are numbers, convert strings if needed
  if (typeof lat === 'string') {
    lat = parseFloat(lat);
  }
  if (typeof lng === 'string') {
    lng = parseFloat(lng);
  }

  // Validate numbers
  if (typeof lat !== 'number' || isNaN(lat)) {
    lat = null;
  }
  if (typeof lng !== 'number' || isNaN(lng)) {
    lng = null;
  }

  return {
    id: show.id,
    date: show.showDate,
    venue_name: show.venueName,
    venue_address: show.venueAddress,
    venue_lat: lat,
    venue_lng: lng,
    city: show.venueCity,
    state: show.venueState,
    country: show.venueCountry,
    location_precision: lat !== null && lng !== null ? 'venue' : undefined,
    fee: show.guarantee ?? 0,
    currency: show.currency,
    venue_capacity: show.venueCapacity ?? null,
  };
}

export interface RouteSegment {
  shows: Show[];
  startIndex: number;
  endIndex: number;
}

/**
 * Segment shows into batches for Google Maps Directions API
 * Google Maps limit: 25 locations per route (1 origin + 23 waypoints + 1 destination)
 */
export function segmentRoute(shows: Show[]): RouteSegment[] {
  const MAX_WAYPOINTS = 23; // Google's limit
  const segments: RouteSegment[] = [];

  if (shows.length === 0) return segments;

  // Single segment for tours with <= 25 shows
  if (shows.length <= MAX_WAYPOINTS + 2) {
    return [{
      shows,
      startIndex: 0,
      endIndex: shows.length - 1
    }];
  }

  // Multiple segments for larger tours
  let i = 0;
  while (i < shows.length) {
    const segmentEnd = Math.min(i + MAX_WAYPOINTS + 1, shows.length - 1);
    const segmentShows = shows.slice(i, segmentEnd + 1);

    segments.push({
      shows: segmentShows,
      startIndex: i,
      endIndex: segmentEnd
    });

    // Overlap by 1 show for continuity (except for the last segment)
    if (segmentEnd < shows.length - 1) {
      i = segmentEnd;
    } else {
      break;
    }
  }

  return segments;
}

/**
 * Get segment colors for visual distinction
 */
export const SEGMENT_COLORS = [
  '#4285F4', // Google Blue - all segments use the same color
  '#4285F4', // Google Blue
  '#4285F4', // Google Blue
  '#4285F4', // Google Blue
  '#4285F4', // Google Blue
  '#4285F4', // Google Blue
  '#4285F4', // Google Blue
  '#4285F4', // Google Blue
];

export function getSegmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

/**
 * Calculate total distance from all route segments
 */
export function calculateTotalDistance(routes: google.maps.DirectionsResult[]): number {
  return routes.reduce((total, route) => {
    if (!route.routes[0]) return total;
    const routeDistance = route.routes[0].legs.reduce((sum, leg) => {
      return sum + (leg.distance?.value || 0);
    }, 0);
    return total + routeDistance;
  }, 0);
}

/**
 * Format distance in miles
 */
export function formatDistance(meters: number): string {
  const miles = meters * 0.000621371;
  return `${miles.toLocaleString(undefined, { maximumFractionDigits: 0 })} miles`;
}

/**
 * Get map bounds that fit all shows
 */
export function getMapBounds(shows: Show[]): google.maps.LatLngBounds | null {
  if (shows.length === 0) return null;

  const bounds = new google.maps.LatLngBounds();

  shows.forEach(show => {
    // Ensure coordinates are valid numbers, not strings or null
    const lat = typeof show.venue_lat === 'number' ? show.venue_lat : null;
    const lng = typeof show.venue_lng === 'number' ? show.venue_lng : null;

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      bounds.extend({
        lat: lat,
        lng: lng
      });
    }
  });

  return bounds;
}

/**
 * Check if show has valid coordinates
 */
export function hasValidCoordinates(show: Show): boolean {
  return typeof show.venue_lat === 'number' &&
         typeof show.venue_lng === 'number' &&
         show.venue_lat !== null &&
         show.venue_lat !== undefined &&
         show.venue_lng !== null &&
         show.venue_lng !== undefined &&
         !isNaN(show.venue_lat) &&
         !isNaN(show.venue_lng);
}

/**
 * Filter shows with valid coordinates
 */
export function getShowsWithCoordinates(shows: Show[]): Show[] {
  return shows.filter(hasValidCoordinates);
}
