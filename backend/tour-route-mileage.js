'use strict';

// Driving-route distances are operational data. They must never depend on
// budgets, currencies, financial line items, or fabricated zero-mile legs.
const METERS_PER_MILE = 1609.344;
const GOOGLE_DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

class RouteMileageError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function routesKey(env = process.env) {
  const key = String(env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || ['undefined', 'null', 'your_api_key_here'].includes(key.toLowerCase())) {
    throw new RouteMileageError(503, 'ROUTING_KEY_NOT_CONFIGURED',
      'SceneGen needs the existing GOOGLE_MAPS_API_KEY configured on the backend. No mileage was changed.');
  }
  return key;
}

function routeLocationKey(location) {
  if (!location) return null;
  if (typeof location.address === 'string' && location.address.trim()) {
    return 'city:' + location.address.trim().toLowerCase();
  }
  if (location.latitude == null || location.longitude == null) return null;
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return 'venue:' + latitude.toFixed(6) + ',' + longitude.toFixed(6);
}

function routeWaypoint(location) {
  if (location.address) return { address: location.address };
  return { location: { latLng: {
    latitude: Number(location.latitude), longitude: Number(location.longitude)
  } } };
}

function googleRouteFailure(status, payload) {
  const providerCode = String(payload?.status || payload?.error?.status || '');
  const message = String(payload?.error_message || payload?.error?.message || '');
  if (providerCode === 'REQUEST_DENIED' || /key.*(invalid|not valid)|not authorized|referer|referer restrictions/i.test(message)) {
    return new RouteMileageError(503, 'ROUTING_ACCESS_DENIED',
      'Google Distance Matrix rejected the configured Maps key. Check that Distance Matrix API is enabled and allowed for the server key. Existing mileage was preserved.');
  }
  if (providerCode === 'OVER_QUERY_LIMIT' || status === 429) {
    return new RouteMileageError(503, 'ROUTING_RATE_LIMITED',
      'Google Distance Matrix quota is exhausted. Existing mileage was preserved.');
  }
  if (status >= 500 || providerCode === 'UNKNOWN_ERROR') {
    return new RouteMileageError(502, 'ROUTING_UNAVAILABLE',
      'Google Distance Matrix is temporarily unavailable. Existing mileage was preserved.');
  }
  return new RouteMileageError(422, 'ROUTE_UNAVAILABLE',
    'Google Distance Matrix could not calculate the requested driving route. Existing mileage was preserved.');
}

function routeEndpoint(location) {
  if (location.address) return String(location.address);
  return Number(location.latitude) + ',' + Number(location.longitude);
}

async function computeDrivingLeg(from, to, apiKey, request = fetch) {
  const params = new URLSearchParams({
    origins: routeEndpoint(from.location),
    destinations: routeEndpoint(to.location),
    mode: 'driving',
    units: 'imperial',
    key: apiKey,
  });
  let response;
  try {
    response = await request(GOOGLE_DISTANCE_MATRIX_URL + '?' + params.toString());
  } catch {
    throw new RouteMileageError(502, 'ROUTING_UNAVAILABLE',
      'SceneGen could not reach Google Distance Matrix. Existing mileage was preserved.');
  }
  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok || payload?.status !== 'OK') {
    console.error('[Routing provider rejection]', {
      provider: 'Google Distance Matrix',
      httpStatus: response.status,
      providerStatus: String(payload?.status || payload?.error?.status || 'UNKNOWN').slice(0, 80),
      providerReason: String(payload?.error_message || payload?.error?.message || '').slice(0, 400),
    });
    throw googleRouteFailure(response.status, payload);
  }
  const element = payload?.rows?.[0]?.elements?.[0];
  const meters = element?.distance?.value;
  if (element?.status !== 'OK' || meters == null ||
      !Number.isFinite(Number(meters)) || Number(meters) < 0) {
    throw new RouteMileageError(422, 'ROUTE_UNAVAILABLE',
      'Google could not find a driving route between ' +
      (from.city || 'the previous stop') + ' and ' + (to.city || 'the next stop') +
      '. Existing mileage was preserved.');
  }
  return {
    fromShowId: from.id, toShowId: to.id,
    meters: Math.round(Number(meters)),
    miles: Math.round(Number(meters) / METERS_PER_MILE * 10) / 10,
    fromLocationKey: routeLocationKey(from.location),
    toLocationKey: routeLocationKey(to.location),
    approximate: from.location.precision === 'city' || to.location.precision === 'city',
  };
}

async function prepareRouteStops(shows, resolveLocation) {
  const mapped = await Promise.all(shows.map(async show => ({
    id: show.id,
    city: show.city,
    showType: show.show_type || 'show',
    location: await resolveLocation(show),
  })));
  const unlocated = mapped.filter(show => !show.location && show.showType === 'show');
  return {
    stops: mapped.filter(show => show.location),
    missingCount: unlocated.length,
  };
}

function summarizeRouteLegs(stops, storedRows) {
  const expected = stops.slice(1).map((to, index) => ({ from: stops[index], to }));
  const empty = { calculated: false, stale: false, totalMiles: null, legs: [], legCount: expected.length };
  if (!storedRows.length) return empty;
  const stored = new Map(storedRows.map(row => [String(row.to_show_id), row]));
  const valid = expected.length === storedRows.length &&
    expected.every(({ from, to }) => {
      const row = stored.get(String(to.id));
      return row && String(row.from_show_id) === String(from.id) &&
        row.from_location_key === routeLocationKey(from.location) &&
        row.to_location_key === routeLocationKey(to.location);
    });
  if (!valid) return { ...empty, stale: true };
  const legs = expected.map(({ from, to }) => {
    const row = stored.get(String(to.id));
    return { fromShowId: from.id, toShowId: to.id, miles: Number(row.distance_miles),
      approximate: Boolean(row.approximate) };
  });
  return {
    calculated: true,
    stale: false,
    totalMiles: Math.round(legs.reduce((sum, leg) => sum + leg.miles, 0) * 10) / 10,
    legs,
    legCount: legs.length,
  };
}

async function readRouteMileage(db, entityId, tourId, shows, resolveLocation) {
  const prepared = await prepareRouteStops(shows, resolveLocation);
  const result = await db.query(
    'SELECT from_show_id,to_show_id,distance_miles,from_location_key,to_location_key,approximate ' +
    'FROM tour_route_legs WHERE entity_id=$1 AND tour_id=$2',
    [entityId, tourId]);
  const summary = summarizeRouteLegs(prepared.stops, result.rows);
  // A missing performance should never produce a misleading partial mileage total.
  if (prepared.missingCount && summary.calculated) return { ...summary, calculated: false, stale: true, totalMiles: null, legs: [] };
  return { ...summary, missingStops: prepared.missingCount };
}

function createRouteMileageHandler({ pool, resolveLocation, fetchRoutes = fetch, env = process.env }) {
  return async function calculateRouteMileage(req, res) {
    const entityId = req.entityId;
    const tourId = req.params.id;
    let client;
    let transaction = false;
    try {
      const tourResult = await pool.query('SELECT id FROM tours WHERE id=$1 AND entity_id=$2',
        [tourId, entityId]);
      if (!tourResult.rowCount && !tourResult.rows.length) {
        throw new RouteMileageError(404, 'TOUR_NOT_FOUND', 'The selected tour was not found.');
      }
      const result = await pool.query(
        'SELECT id,date,city,state,country,show_type,venue_name,' +
        'COALESCE(venue_lat,latitude) AS venue_lat,COALESCE(venue_lng,longitude) AS venue_lng ' +
        'FROM shows WHERE tour_id=$1 AND entity_id=$2 ORDER BY date ASC,id ASC',
        [tourId, entityId]);
      const { stops, missingCount } = await prepareRouteStops(result.rows, resolveLocation);
      if (missingCount > 0) {
        throw new RouteMileageError(422, 'MISSING_ROUTE_LOCATIONS',
          missingCount + ' performance' + (missingCount === 1 ? ' needs' : 's need') +
          ' a venue or city before mileage can be calculated. Existing mileage was preserved.');
      }
      if (stops.length < 2) {
        throw new RouteMileageError(422, 'NOT_ENOUGH_ROUTE_STOPS',
          'At least two dates with locations are needed to calculate a driving route.');
      }
      const key = routesKey(env);
      const legs = [];
      for (let i = 1; i < stops.length; i++) {
        legs.push(await computeDrivingLeg(stops[i - 1], stops[i], key, fetchRoutes));
      }

      // Google must complete EVERY leg successfully before storage begins.
      client = await pool.connect();
      await client.query('BEGIN');
      transaction = true;
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['tour-mileage:' + entityId + ':' + tourId]);
      const lockedTour = await client.query(
        'SELECT id FROM tours WHERE id=$1 AND entity_id=$2 FOR UPDATE', [tourId, entityId]);
      if (!lockedTour.rows.length) throw new RouteMileageError(404, 'TOUR_NOT_FOUND', 'The selected tour was removed.');
      const current = await client.query(
        'SELECT id,date,city,state,country,show_type,venue_name,' +
        'COALESCE(venue_lat,latitude) AS venue_lat,COALESCE(venue_lng,longitude) AS venue_lng ' +
        'FROM shows WHERE tour_id=$1 AND entity_id=$2 ORDER BY date ASC,id ASC',
        [tourId, entityId]);
      const refreshed = await prepareRouteStops(current.rows, resolveLocation);
      if (refreshed.missingCount || refreshed.stops.length !== stops.length ||
        refreshed.stops.some((stop, i) => stop.id !== stops[i].id ||
          routeLocationKey(stop.location) !== routeLocationKey(stops[i].location))) {
        throw new RouteMileageError(409, 'ROUTE_STOPS_CHANGED',
          'The tour dates or venues changed during calculation. No mileage was changed; please retry.');
      }
      await client.query('DELETE FROM tour_route_legs WHERE entity_id=$1 AND tour_id=$2', [entityId, tourId]);
      for (const leg of legs) {
        await client.query(
          'INSERT INTO tour_route_legs (entity_id,tour_id,from_show_id,to_show_id,' +
          'distance_miles,distance_meters,from_location_key,to_location_key,approximate) ' +
          'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [entityId,tourId,leg.fromShowId,leg.toShowId,leg.miles,leg.meters,
            leg.fromLocationKey,leg.toLocationKey,leg.approximate]);
      }
      const mileage = await readRouteMileage(client, entityId, tourId, current.rows, resolveLocation);
      if (!mileage.calculated || mileage.legs.length !== legs.length) {
        throw new Error('Route mileage verification did not match the saved legs');
      }
      await client.query('COMMIT');
      transaction = false;
      return res.json({
        success: true,
        distancesCalculated: legs.length,
        routeMileage: mileage,
        approximateStops: stops.filter(s => s.location.precision === 'city').length,
      });
    } catch (error) {
      if (transaction) await client.query('ROLLBACK').catch(() => {});
      if (error instanceof RouteMileageError) {
        return res.status(error.status).json({ error: { code: error.code, message: error.message } });
      }
      console.error('Tour mileage update failed', { code: error?.code, message: error?.message });
      return res.status(500).json({
        error: { code: 'ROUTE_MILEAGE_FAILED',
          message: 'SceneGen could not update the route mileage. Existing mileage and budgets were preserved.' },
      });
    } finally {
      client?.release();
    }
  };
}

// A single harmless request at startup diagnoses configuration independently of users.
// Never log request URLs, response headers, API keys, or secrets.
async function diagnoseRoutingConfiguration(env = process.env, request = fetch) {
  let key;
  try { key = routesKey(env); } catch (e) {
    console.error('[Routing startup diagnostic]', { status: e.code }); return;
  }
  const params = new URLSearchParams({
    origins: 'Glasgow, Scotland, UK', destinations: 'Nottingham, England, UK',
    mode: 'driving', key,
  });
  try {
    const response = await request(GOOGLE_DISTANCE_MATRIX_URL + '?' + params.toString());
    const body = await response.json().catch(() => null);
    console.log('[Routing startup diagnostic]', {
      provider: 'Google Distance Matrix',
      httpStatus: response.status,
      providerStatus: String(body?.status || 'NO_STATUS').slice(0, 80),
      elementStatus: String(body?.rows?.[0]?.elements?.[0]?.status || 'NO_ELEMENT').slice(0, 80),
      providerReason: String(body?.error_message || '').slice(0, 400),
    });
  } catch (error) {
    console.error('[Routing startup diagnostic]', { status: 'NETWORK_ERROR', message: String(error?.message || '').slice(0, 120) });
  }
}

module.exports = {
  RouteMileageError, routesKey, routeLocationKey, googleRouteFailure,
  computeDrivingLeg, prepareRouteStops, summarizeRouteLegs,
  readRouteMileage, createRouteMileageHandler, diagnoseRoutingConfiguration,
};
