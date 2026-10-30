export type DiscoverySort = 'relevance' | 'location' | 'name';

export type DiscoveryResult = {
  name: string;
  profileId: string | null;
  matchingGenres: string[];
  knownLocations?: Array<{ city: string; country: string }>;
  matchBasis?: 'promoter_selected' | 'past_bookings' | 'both' | 'contact_listing' | null;
  discoverySource?: 'profile' | 'past_bookings' | 'contact_only';
};

const evidenceRank: Record<string, number> = {
  both: 4, promoter_selected: 3, past_bookings: 2, contact_listing: 1,
};

export function sortDiscoveryResults<T extends DiscoveryResult>(results: T[], sort: DiscoverySort): T[] {
  const location = (item: T) => item.knownLocations?.[0];
  const compareLocation = (a: T, b: T) => {
    const first = location(a), second = location(b);
    return (first?.country || '').localeCompare(second?.country || '')
      || (first?.city || '').localeCompare(second?.city || '');
  };
  return [...results].sort((a, b) => {
    if (sort === 'location') return compareLocation(a, b) || a.name.localeCompare(b.name);
    if (sort === 'name') return a.name.localeCompare(b.name) || compareLocation(a, b);
    return b.matchingGenres.length - a.matchingGenres.length
      || (evidenceRank[b.matchBasis || ''] || 0) - (evidenceRank[a.matchBasis || ''] || 0)
      || compareLocation(a, b)
      || a.name.localeCompare(b.name);
  });
}

export function discoverySummary<T extends DiscoveryResult>(results: T[]) {
  return {
    matches: results.length,
    registered: results.filter(result => Boolean(result.profileId)).length,
    locations: new Set(results.flatMap(result => (result.knownLocations || [])
      .filter(place => Boolean(place.city))
      .map(place => `${place.city.trim().toLowerCase()}|${place.country.trim().toLowerCase()}`))).size,
  };
}
