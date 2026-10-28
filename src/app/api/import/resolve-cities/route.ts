import { getBackendHeaders, getBackendUrl } from '@/lib/backend';
import { NextRequest, NextResponse } from 'next/server';

type CityInput = { key: string; city: string; state?: string; country?: string };

export async function POST(request: NextRequest) {
  try {
    const { cities } = await request.json() as { cities?: CityInput[] };
    if (!Array.isArray(cities) || cities.length === 0 || cities.length > 50) {
      return NextResponse.json({ error: 'Supply between 1 and 50 cities' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key is not configured' }, { status: 503 });
    }

    const results = await Promise.all(cities.map(async (input) => {
      const query = [input.city, input.state, input.country].filter(Boolean).join(', ');
      const params = new URLSearchParams({ address: query, key: apiKey });
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`Google city lookup returned HTTP ${response.status}`);

      const payload = await response.json();
      if (['REQUEST_DENIED', 'OVER_DAILY_LIMIT', 'UNKNOWN_ERROR'].includes(payload.status)) {
        throw new Error(`Google city lookup is unavailable (${payload.status})`);
      }
      const match = payload.status === 'OK' ? payload.results?.[0] : null;
      if (!match?.geometry?.location) return { key: input.key, status: 'unresolved' as const };

      const component = (type: string, short = false) => {
        const value = match.address_components?.find((item: { types?: string[] }) => item.types?.includes(type));
        return value ? (short ? value.short_name : value.long_name) : undefined;
      };

      return {
        key: input.key,
        status: 'resolved' as const,
        label: match.formatted_address,
        city: component('locality') || component('postal_town') || input.city,
        state: component('administrative_area_level_1', true) || input.state,
        country: component('country') || input.country,
        lat: match.geometry.location.lat,
        lng: match.geometry.location.lng,
        partialMatch: Boolean(match.partial_match),
      };
    }));

    const verified = results.filter((item) => item.status === 'resolved' && !item.partialMatch
      && typeof item.city === 'string' && typeof item.country === 'string'
      && Number.isFinite(item.lat) && Number.isFinite(item.lng));
    if (verified.length) {
      const stored = await fetch(getBackendUrl() + '/internal/city-geocodes/store', {
        method: 'POST', cache: 'no-store',
        headers: getBackendHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ places: verified }),
      });
      if (!stored.ok) throw new Error('Could not persist the verified city coordinates');
    }
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Failed to resolve import cities:', error);
    return NextResponse.json({ error: 'City lookup failed' }, { status: 500 });
  }
}
