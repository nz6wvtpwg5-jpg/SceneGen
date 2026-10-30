const crypto = require('node:crypto');
/*
 * Artist-facing promoter discovery.
 *
 * Only names recorded on genuine past shows and genres on artist/promoter
 * profiles are searchable. Private contact details never leave this module.
 */
const PROFILE_SQL = [
  "SELECT e.id::text AS id, e.name,",
  "  CASE WHEN jsonb_typeof(e.tags)='array' THEN e.tags ELSE '[]'::jsonb END AS tags",
  "FROM entities e WHERE e.entity_type='promoter'",
  "ORDER BY e.name, e.id LIMIT 5000",
].join('\n');

const HISTORICAL_PROMOTERS_SQL = [
  "WITH evidence AS (",
  "  SELECT lower(trim(s.promoter_email)) AS internal_email_key,",
  "    trim(s.promoter_name) AS promoter_name, s.date AS show_date, s.id AS show_id,",
  "    band.name AS band_name, s.city AS show_city, s.country AS show_country,",
  "    CASE WHEN jsonb_typeof(band.tags)='array' THEN band.tags ELSE '[]'::jsonb END AS band_tags,",
  "    linked.id::text AS verified_profile_id",
  "  FROM private_contact_shows pcs",
  "  JOIN private_contacts pc ON pc.id=pcs.contact_id AND pc.entity_id=pcs.entity_id",
  "  JOIN shows s ON s.id=pcs.show_id AND s.entity_id::text=pcs.entity_id::text",
  "  JOIN entities band ON band.id::text=s.entity_id::text AND band.entity_type='artist'",
  "  LEFT JOIN promoter_claims claim ON claim.email=lower(trim(s.promoter_email))",
  "  LEFT JOIN entities linked ON linked.id=claim.entity_id AND linked.entity_type='promoter'",
  "  WHERE NULLIF(trim(s.promoter_email),'') IS NOT NULL",
  "    AND lower(trim(s.promoter_email))=lower(trim(pc.email))",
  "    AND NULLIF(trim(s.promoter_name),'') IS NOT NULL",
  "    AND s.date<CURRENT_DATE",
  "    AND COALESCE(s.show_type,'show') NOT IN ('off_day','travel_day')",
  "    AND COALESCE(lower(trim(s.status)),'confirmed') IN ('confirmed','completed','performed')",
  ")",
  "SELECT internal_email_key,",
  "  (array_agg(promoter_name ORDER BY show_date DESC,show_id DESC))[1] AS promoter_name,",
  "  jsonb_agg(DISTINCT band_tags) AS band_tag_groups,",
  "  jsonb_agg(DISTINCT jsonb_build_object('name',band_name,'date',show_date)) AS bands_worked_with,",
  "  jsonb_agg(DISTINCT jsonb_build_object('city',show_city,'country',show_country)) AS known_locations,",
  "  array_remove(array_agg(DISTINCT verified_profile_id),NULL) AS verified_profile_ids",
  "FROM evidence GROUP BY internal_email_key",
  "ORDER BY internal_email_key LIMIT 5000",
].join('\n');

// Contacts without shows contribute only a generic promoter classification and
// city/country. Names, organizations, addresses and private fields never leave SQL.
const CONTACT_ONLY_PROMOTERS_SQL = [
  "SELECT COALESCE(NULLIF(lower(trim(pc.email)),''), 'contact:' || pc.id::text) AS internal_email_key,",
  "  'Promoter'::text AS promoter_name,",
  "  '[]'::jsonb AS band_tag_groups, '[]'::jsonb AS bands_worked_with,",
  "  (SELECT COALESCE(jsonb_agg(lower(tag)), '[]'::jsonb)",
  "     FROM jsonb_array_elements_text(pc.tags) AS tag",
  "     WHERE lower(tag) ~ '^#[a-z0-9]{2,40}$') AS listed_genres,",
  "  jsonb_build_array(jsonb_build_object('city',pc.city,'country',pc.country)) AS known_locations,",
  "  ARRAY[]::text[] AS verified_profile_ids,",
  "  pc.entity_id::text AS source_entity_id, TRUE AS contact_only",
  "FROM private_contacts pc",
  "JOIN entities owner ON owner.id=pc.entity_id AND owner.entity_type='artist'",
  "WHERE pc.linked_entity_id IS NULL",
  // A verified promoter is discoverable through their public profile. Do not
  // show a second anonymous card from an unlinked private address-book entry.
  "  AND NOT EXISTS (SELECT 1 FROM promoter_claims claim",
  "    JOIN entities verified ON verified.id=claim.entity_id AND verified.entity_type='promoter'",
  "    WHERE claim.email=lower(trim(pc.email)))",
  "  AND pc.city IS NOT NULL AND trim(pc.city)<>''",
  "  AND pc.country IS NOT NULL AND trim(pc.country)<>''",
  "  AND (EXISTS (SELECT 1 FROM jsonb_array_elements_text(pc.roles) role WHERE lower(trim(role))='promoter')",
  "       OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(pc.tags) tag WHERE lower(trim(tag))='promoter'))",
  "ORDER BY pc.created_at DESC LIMIT 5000",
].join('\n');

function normalizeGenre(value) {
  if (typeof value !== 'string') return '';
  const slug = value.trim().toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '').slice(0, 40);
  return slug ? '#' + slug : '';
}

function normalizeGenres(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.slice(0, 20).map(normalizeGenre).filter(Boolean))].slice(0, 12);
}

function publicPromoterName(value) {
  if (typeof value !== 'string') return '';
  const name = value
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '')
    .replace(/\b(?:e-?mail|phone|tel|mobile)\s*[:=]\s*/gi, '')
    .replace(/\+?\d[\d\s().-]{6,}\d/g, '')
    .replace(/\s+/g, ' ').trim().slice(0, 160);
  return /^(?:unknown|tbd|not set|n\/a)$/i.test(name) ? '' : name;
}

function bandTagsFromGroups(value) {
  if (!Array.isArray(value)) return [];
  return normalizeGenres(value.flatMap(group => Array.isArray(group) ? group : []));
}

function discoverPromoters(profiles, evidence, { genres = [], query = '', excludedEmails = [], excludedProfileIds = [], city = '', country = '', viewerEntityId = '', signingSecret = '' } = {}) {
  const excluded = new Set(excludedEmails.map(value => String(value).trim().toLowerCase()));
  const excludedProfiles = new Set(excludedProfileIds.map(String));
  const filters = normalizeGenres(genres);
  const search = String(query || '').trim().toLocaleLowerCase().slice(0, 80);
  const searchGenre = normalizeGenre(search);
  const requestedCity = String(city).trim().toLowerCase();
  const requestedCountry = String(country).trim().toLowerCase();
  if (!search && !filters.length && !requestedCity && !requestedCountry) return [];

  const claimed = new Map();
  for (const profile of profiles || []) {
    const name = publicPromoterName(profile?.name);
    const profileId = String(profile?.id || '');
    if (!name || !/^[0-9a-f-]{36}$/i.test(profileId) || excludedProfiles.has(profileId)) continue;
    claimed.set(profileId, {
      profileId, name, own: new Set(normalizeGenres(profile.tags)),
      fromBands: new Set(), listed: new Set(), bands: new Map(), locations: new Map(),
    });
  }

  const unclaimed = new Map();
  for (const record of evidence || []) {
    // The key is used strictly for deduplication on the server. Never return it.
    const key = String(record?.internal_email_key || '').trim().toLocaleLowerCase();
    if (record?.source_entity_id && String(record.source_entity_id) === String(viewerEntityId)) continue;
    if (!key || excluded.has(key) || (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) && !/^contact:[0-9a-f-]{36}$/i.test(key))) continue;
    const name = publicPromoterName(record.promoter_name);
    if (!name) continue;
    const verifiedIds = [...new Set(
      (Array.isArray(record.verified_profile_ids) ? record.verified_profile_ids : [])
        .filter(id => typeof id === 'string' && claimed.has(id))
    )];
    let entry;
    if (verifiedIds.length === 1) {
      // A promoter profile is linked only after reciprocal verification.
      entry = claimed.get(verifiedIds[0]);
    } else {
      entry = unclaimed.get(key);
      if (!entry) {
        entry = { profileId: null, name: 'Promoter', own: new Set(), fromBands: new Set(), listed: new Set(), bands: new Map(), locations: new Map(), contactOnly: true, discoveryKey: signingSecret ? 'anonymous:' + crypto.createHmac('sha256', signingSecret).update('promoter-discovery:v1:' + key).digest('hex') : null };
        unclaimed.set(key, entry);
      }
    }
    if (!record.contact_only) entry.contactOnly = false;
    for (const tag of bandTagsFromGroups(record.band_tag_groups)) entry.fromBands.add(tag);
    for (const tag of normalizeGenres(record.listed_genres)) entry.listed.add(tag);
    for (const item of Array.isArray(record.bands_worked_with) ? record.bands_worked_with : []) {
      const band = typeof item?.name === 'string' ? item.name.trim().slice(0,140) : '';
      const date = typeof item?.date === 'string' ? item.date.slice(0,10) : '';
      if (band && (!entry.bands.has(band.toLowerCase()) || date > entry.bands.get(band.toLowerCase()).date))
        entry.bands.set(band.toLowerCase(), { name:band, date });
    }
    for (const place of Array.isArray(record.known_locations) ? record.known_locations : []) {
      const city = typeof place?.city === 'string' ? place.city.trim().slice(0,120) : '';
      const country = typeof place?.country === 'string' ? place.country.trim().slice(0,120) : '';
      if (city) entry.locations.set((city+'|'+country).toLowerCase(), { city, country });
    }
  }

  return [...claimed.values(), ...unclaimed.values()]
    .map(entry => {
      const locations = [...entry.locations.values()];
      const locationMatch = (!requestedCity && !requestedCountry) || locations.some(place =>
        (!requestedCity || place.city.toLowerCase() === requestedCity) &&
        (!requestedCountry || place.country.toLowerCase() === requestedCountry ||
          (['usa','united states','united states of america'].includes(requestedCountry) && ['usa','united states','united states of america'].includes(place.country.toLowerCase()))));
      const declaredGenres = [...entry.own].sort();
      const associatedBandGenres = [...entry.fromBands].sort();
      const listedGenres = [...entry.listed].sort();
      const all = new Set([...declaredGenres, ...associatedBandGenres, ...listedGenres]);
      const matchingGenres = filters.filter(tag => all.has(tag));
      const searchGenreMatch = Boolean(search && searchGenre && all.has(searchGenre));
      const nameMatch = !search || (entry.profileId && entry.name.toLocaleLowerCase().includes(search))
        || searchGenreMatch;
      const declaredMatch = matchingGenres.some(tag => entry.own.has(tag));
      const associatedMatch = matchingGenres.some(tag => entry.fromBands.has(tag));
      const listedMatch = matchingGenres.some(tag => entry.listed.has(tag));
      return {
        name: entry.profileId ? entry.name : 'Promoter', profileId: entry.profileId,
        discoveryKey: entry.profileId ? `profile:${entry.profileId}` : entry.discoveryKey || null,
        // Multiple location hints from someone else's private address book can
        // identify an unclaimed contact by triangulation. Show one city only.
        knownLocations: entry.profileId
          ? [...entry.locations.values()].sort((a,b)=>a.city.localeCompare(b.city)).slice(0,20)
          : [...entry.locations.values()].filter(place => locationMatch &&
              (!requestedCity || place.city.toLowerCase() === requestedCity) &&
              (!requestedCountry || place.country.toLowerCase() === requestedCountry ||
                (['usa','united states','united states of america'].includes(requestedCountry) && ['usa','united states','united states of america'].includes(place.country.toLowerCase()))))
            .sort((a,b)=>a.city.localeCompare(b.city)).slice(0,1),
        bandsWorkedWith: [...entry.bands.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(item=>item.name),
        registrationStatus: entry.profileId ? 'registered' : 'not_registered',
        discoverySource: entry.profileId ? 'profile' : entry.contactOnly ? 'contact_only' : 'past_bookings',
        declaredGenres, associatedBandGenres, listedGenres, matchingGenres,
        matchBasis: declaredMatch && associatedMatch ? 'both'
          : declaredMatch ? 'promoter_selected' : associatedMatch ? 'past_bookings'
          : listedMatch ? 'contact_listing' : null,
        // Location narrows an explicit genre search; it must never override it.
        // Never expose community-listed identities through city-only queries.
        // An unclaimed listing requires positive genre evidence, even when the
        // user provides a location but no genre filters.
        _accepted: locationMatch && nameMatch && (!filters.length || matchingGenres.length > 0)
          && (Boolean(entry.profileId) || matchingGenres.length > 0),
      };
    })
    .filter(result => result._accepted)
    .sort((a, b) =>
      b.matchingGenres.length - a.matchingGenres.length
      || Number(b.matchBasis === 'promoter_selected' || b.matchBasis === 'both')
          - Number(a.matchBasis === 'promoter_selected' || a.matchBasis === 'both')
      || a.name.localeCompare(b.name)
    )
    .slice(0, 60)
    .map(({ _accepted, ...publicRecord }) => publicRecord);
}

module.exports = {
  PROFILE_SQL, HISTORICAL_PROMOTERS_SQL, CONTACT_ONLY_PROMOTERS_SQL, normalizeGenre, normalizeGenres,
  publicPromoterName, discoverPromoters,
};
