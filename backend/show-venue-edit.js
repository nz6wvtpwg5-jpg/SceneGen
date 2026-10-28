'use strict';

/**
 * A venue's existing Google Place ID is metadata, not permission to call Google
 * Places on every show edit. Only an explicit user selection may initiate an
 * identity lookup. Other show fields must remain editable during Places outages.
 */
const EDIT_INTENTS = new Set(['google', 'stored']);

function inputError(message) {
  const error = new Error(message);
  error.status = 422;
  return error;
}

function prepareShowVenueEdit(input = {}) {
  const fields = { ...input };
  const intent = fields.venueSelectionIntent || null;
  if (intent && !EDIT_INTENTS.has(intent)) {
    throw inputError('Choose a venue from SceneGen or Google Places.');
  }
  delete fields.venueSelectionIntent;
  const venueMetadata = {
    venueId: intent === 'stored' ? fields.venueId : undefined,
    venuePlaceId: intent === 'google' ? fields.venuePlaceId : undefined,
  };
  if (intent === 'google' && (typeof venueMetadata.venuePlaceId !== 'string' || !venueMetadata.venuePlaceId.trim())) {
    throw inputError('Choose a Google venue from the suggestions.');
  }
  if (intent === 'stored' && (typeof venueMetadata.venueId !== 'string' || !venueMetadata.venueId.trim())) {
    throw inputError('Choose a venue from SceneGen.');
  }

  // The form might resend a historical ID unintentionally. Without explicit
  // selection we must not reverify, persist, or mutate the venue association.
  delete fields.venueId;
  delete fields.venuePlaceId;
  delete fields.googleVerified;
  delete fields.countryCode;
  delete fields.postalCode;

  return { fields, venueMetadata, intent };
}

async function resolveShowVenueEdit(edit, currentShow, trustedVenueInput, client) {
  if (!edit.intent) return false;

  const same = edit.intent === 'google'
    ? edit.venueMetadata.venuePlaceId === currentShow.venue_place_id
    : edit.venueMetadata.venueId === currentShow.venue_id;
  if (same) {
    edit.venueMetadata.venueId = undefined;
    edit.venueMetadata.venuePlaceId = undefined;
    return false;
  }
  // A stored venue is resolved locally. A deliberately chosen new Google
  // venue must be verified; we do not trust arbitrary client place IDs.
  const source = edit.intent === 'google'
    ? { ...edit.fields, venuePlaceId: edit.venueMetadata.venuePlaceId }
    : { ...edit.fields, venueId: edit.venueMetadata.venueId };
  const trusted = await trustedVenueInput(source, client);
  Object.assign(edit.fields, trusted);
  edit.venueMetadata.venuePlaceId = trusted.venuePlaceId || undefined;
  delete edit.fields.venueId;
  delete edit.fields.googleVerified;
  delete edit.fields.countryCode;
  delete edit.fields.postalCode;
  // Only an explicitly verified venue ID may reach the update query.
  if (!edit.venueMetadata.venuePlaceId) delete edit.fields.venuePlaceId;
  return true;
}

module.exports = { prepareShowVenueEdit, resolveShowVenueEdit };
