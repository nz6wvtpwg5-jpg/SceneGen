const { canonicalCountry, matches: territoryMatches } = require('./territories');

const clean = (value, max = 10000) => String(value || '').trim().slice(0, max);

function addressPart(components, type, short = false) {
  const item = (components || []).find((component) => (component.types || []).includes(type));
  return item ? clean(short ? item.shortText : item.longText, 120) : '';
}

async function verifiedPlace(placeId) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const error = new Error('Venue verification is not configured');
    error.status = 503;
    throw error;
  }
  if (!/^[-A-Za-z0-9_]{8,300}$/.test(placeId)) {
    const error = new Error('Choose a venue from Google Places');
    error.status = 422;
    throw error;
  }
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,location' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const error = new Error(response.status === 404 ? 'That venue could not be verified' : 'Venue verification is temporarily unavailable');
    error.status = response.status === 404 ? 422 : 503;
    throw error;
  }
  const place = await response.json();
  const canonicalPlaceId = clean(place.id, 300);
  const countryCode = addressPart(place.addressComponents, 'country', true).toUpperCase();
  const country = canonicalCountry(countryCode) || canonicalCountry(addressPart(place.addressComponents, 'country'));
  const city = addressPart(place.addressComponents, 'locality') || addressPart(place.addressComponents, 'postal_town') || addressPart(place.addressComponents, 'administrative_area_level_2');
  const region = addressPart(place.addressComponents, 'administrative_area_level_1');
  const latitude = Number(place.location?.latitude);
  const longitude = Number(place.location?.longitude);
  if (!/^[-A-Za-z0-9_]{8,300}$/.test(canonicalPlaceId) || !country || !/^[A-Z]{2}$/.test(countryCode) || !city || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    const error = new Error('The selected venue does not contain a complete, supported location');
    error.status = 422;
    throw error;
  }
  return { placeId: canonicalPlaceId, name: clean(place.displayName?.text, 255), address: clean(place.formattedAddress, 2000), city, region, country, countryCode, latitude, longitude };
}

async function proposalGrant(client, entityId, userId, country) {
  const grants = await client.query(`SELECT id, scope_type, countries
    FROM day_sheet_access_grants
    WHERE entity_id::text=$1 AND user_id=$2::uuid AND can_propose_shows=TRUE
      AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>NOW())
      AND scope_type IN ('all','countries')
    ORDER BY created_at DESC FOR SHARE`, [entityId, userId]);
  return grants.rows.find((grant) => grant.scope_type === 'all'
    || (grant.scope_type === 'countries' && territoryMatches(grant.countries, country))) || null;
}

module.exports = { clean, verifiedPlace, proposalGrant };
