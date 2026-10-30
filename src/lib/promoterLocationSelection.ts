/** Google Places region suggestions may be cities or administrative areas. */
export type PlaceSelection = { types?: string[]; address_components?: Array<{ long_name: string; types: string[] }> };

export function selectedCountryName(place: PlaceSelection): string | null {
  if (!place.types?.includes('country')) return null;
  const component = place.address_components?.find(part => part.types.includes('country'));
  return component?.long_name?.trim() || null;
}
