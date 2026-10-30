'use strict';

const { discoverPromoters, normalizeGenres } = require('./promoter-discovery');

// Never return a private-derived snapshot when its current source is no longer
// discoverable. The stored bookmark stays removable by its owning band.
function unavailablePromoter() {
  return {
    name: 'Unavailable promoter', profileId: null,
    registrationStatus: 'not_registered', discoverySource: 'contact_only',
    knownLocations: [], matchingGenres: [], bandsWorkedWith: [], matchBasis: null,
  };
}

function publicSnapshot(result) {
  return {
    name: result.name,
    profileId: result.profileId,
    registrationStatus: result.registrationStatus,
    discoverySource: result.discoverySource,
    knownLocations: result.knownLocations,
    matchingGenres: result.matchingGenres,
    matchBasis: result.matchBasis,
    bandsWorkedWith: result.bandsWorkedWith,
  };
}

function revalidateShortlist(rows, profiles, evidence, {viewerEntityId, signingSecret, excludedEmails=[],excludedProfileIds=[],communityGenres=[]}) {
  const saved = Array.isArray(rows) ? rows : [];
  const groups = new Map();
  for (const item of saved) {
    const key = String(item.discovery_key || '');
    if (!/^(?:profile:[0-9a-f-]{36}|anonymous:[0-9a-f]{64})$/i.test(key)) continue;
    // A registered promoter is publicly discoverable irrespective of genres.
    // Unregistered matches must still share a genre that was present when saved.
    const genres = key.startsWith('profile:') ? [] : normalizeGenres(item.public_snapshot?.matchingGenres);
    if (key.startsWith('anonymous:') && !genres.length) continue;
    const signature = genres.join('|');
    if (!groups.has(signature)) groups.set(signature, {genres, keys:new Set()});
    groups.get(signature).keys.add(key);
  }
  const current = new Map();
  for (const { genres, keys } of groups.values()) {
    const found = discoverPromoters(profiles, evidence, {
      genres, viewerEntityId, signingSecret, communityGenres,
      excludedEmails,excludedProfileIds,targetKeys:keys,
    });
    for (const result of found) current.set(result.discoveryKey, publicSnapshot(result));
  }
  return saved.map(item => {
    const fresh = current.get(item.discovery_key);
    return {
      id:item.id,discoveryKey:item.discovery_key,
      status:fresh ? 'available' : 'unavailable',
      promoter:fresh || unavailablePromoter(),
      createdAt:item.created_at,
    };
  });
}

module.exports = { revalidateShortlist, unavailablePromoter, publicSnapshot };
