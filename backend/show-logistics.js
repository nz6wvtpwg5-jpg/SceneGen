const express = require('express');
const { resolveShowCountry } = require('./territories');
const { normalizedDate, normalizedFlightNumber } = require('./flight-validation');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODES = new Set(['van', 'bus', 'car', 'train', 'flight', 'ferry', 'other']);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const cleanText = (value, maximum) => value == null || value === '' ? null : String(value).trim().slice(0, maximum);
const canEdit = (req) => !req.isExternalDaySheetCollaborator || ['advance', 'full'].includes(req.daySheetPermissions?.editScope);
const requestBody = (req) => req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};

function instant(value) {
  if (value == null || value === '') return { valid: true, value: null };
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return { valid: false, value: null };
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? { valid: false, value: null } : { valid: true, value: parsed.toISOString() };
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function currencyCode(value) {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

function safeUrl(value) {
  const cleaned = cleanText(value, 1000);
  if (!cleaned) return null;
  try {
    const parsed = new URL(cleaned);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function suggestedLocalDeparture(show, duration) {
  if (!show.date || !show.load_in_time || duration == null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(show.date).slice(0, 10));
  const time = /^(\d{2}):(\d{2})/.exec(String(show.load_in_time));
  if (!match || !time) return null;
  const arrival = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(time[1]), Number(time[2]));
  return new Date(arrival - Number(duration) * 60000).toISOString().slice(0, 16);
}

function derivedTravel(show, previous, stored, budgetDistance) {
  const distance = stored?.distance_miles == null
    ? (budgetDistance == null ? null : Number(budgetDistance)) : Number(stored.distance_miles);
  const duration = stored?.duration_minutes == null && distance != null
    ? Math.ceil(distance / 50 * 60 + Math.floor(distance / 200) * 30) : stored?.duration_minutes ?? null;
  const fromCountry = resolveShowCountry(previous?.country, previous?.venue_address);
  const toCountry = resolveShowCountry(show.country, show.venue_address);
  return {
    ...stored,
    distance_miles: distance,
    duration_minutes: duration,
    suggested_departure_local: stored?.departure_at ? null : suggestedLocalDeparture(show, duration),
    origin: previous ? { id: previous.id, venue_name: previous.venue_name, city: previous.city, country: fromCountry } : null,
    destination: { id: show.id, venue_name: show.venue_name, city: show.city, country: toCountry },
    crosses_border: Boolean(fromCountry && toCountry && fromCountry !== toCountry),
  };
}

function hasRecordedJourney(stored) {
  if (!stored) return false;
  return ['departure_at', 'arrival_at', 'duration_minutes', 'distance_miles', 'border_notes', 'ferry_notes',
    'tolls_vignettes_notes', 'low_emission_zone_notes', 'parking_access_notes', 'driver_notes']
    .some((key) => stored[key] !== null && stored[key] !== undefined && stored[key] !== '');
}

function createShowLogisticsRouter(pool) {
  const router = express.Router();

  router.use('/shows/:id/logistics', (req, res, next) => {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: { message: 'Invalid show ID' } });
    next();
  });

  router.get('/shows/:id/logistics', async (req, res) => {
    const showResult = await pool.query('SELECT * FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text', [req.params.id, req.entityId]);
    if (!showResult.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
    const show = showResult.rows[0];
    const previous = show.tour_id ? await pool.query(`WITH ordered AS (
        SELECT id, lag(id) OVER (ORDER BY date, start_time, id) previous_id
        FROM shows WHERE tour_id=$1::uuid AND entity_id::text=$2::text
      ) SELECT previous_show.* FROM ordered current_show
      JOIN shows previous_show ON previous_show.id=current_show.previous_id
      WHERE current_show.id=$3::uuid`, [show.tour_id, req.entityId, show.id]) : { rows: [] };
    const [travel, hotel, distance, flight] = await Promise.all([
      pool.query(`SELECT plan.* FROM show_travel_plans plan JOIN shows show_record ON show_record.id=plan.show_id
        WHERE plan.show_id=$1::uuid AND show_record.entity_id::text=$2::text`, [show.id, req.entityId]),
      pool.query(`SELECT hotel.* FROM show_accommodations hotel JOIN shows show_record ON show_record.id=hotel.show_id
        WHERE hotel.show_id=$1::uuid AND show_record.entity_id::text=$2::text`, [show.id, req.entityId]),
      pool.query(`SELECT min(distance) distance FROM budgets WHERE show_id=$1::uuid AND entity_id::text=$2::text
        AND distance IS NOT NULL HAVING count(DISTINCT distance)=1`, [show.id, req.entityId]),
      pool.query(`SELECT booking.* FROM show_flight_bookings booking JOIN shows show_record ON show_record.id=booking.show_id
        WHERE booking.show_id=$1::uuid AND show_record.entity_id::text=$2::text`, [show.id, req.entityId]),
    ]);
    const accommodation = hotel.rows[0] ? { ...hotel.rows[0] } : null;
    if (accommodation && req.isExternalDaySheetCollaborator && req.daySheetPermissions?.financialAccess === 'hidden') {
      delete accommodation.payer;
      delete accommodation.outstanding_balance;
      delete accommodation.currency;
    }
    res.json({
      travel: derivedTravel(show, previous.rows[0], travel.rows[0] || null, distance.rows[0]?.distance),
      journeyAvailable: Boolean(previous.rows[0] || hasRecordedJourney(travel.rows[0])),
      isTourShow: Boolean(show.tour_id),
      accommodation,
      flight: flight.rows[0] || null,
    });
  });

  router.patch('/shows/:id/logistics', async (req, res) => {
    if (!canEdit(req)) return res.status(403).json({ error: { message: 'This invitation cannot edit travel or accommodation' } });
    const body = requestBody(req);
    if (body.section === 'travel') {
      if (own(body, 'transportMode') && !MODES.has(body.transportMode)) return res.status(422).json({ error: { message: 'Choose a valid transport mode' } });
      const mode = MODES.has(body.transportMode) ? body.transportMode : 'van';
      const duration = numberOrNull(body.durationMinutes);
      const distance = numberOrNull(body.distanceMiles);
      const departure = instant(body.departureAt);
      const arrival = instant(body.arrivalAt);
      if (!departure.valid || !arrival.valid) return res.status(422).json({ error: { message: 'Enter valid departure and arrival times with a timezone' } });
      if (departure.value && arrival.value && Date.parse(arrival.value) < Date.parse(departure.value)) return res.status(422).json({ error: { message: 'Arrival cannot be before departure' } });
      if ((duration != null && (!Number.isInteger(duration) || duration < 0 || duration > 10080))
        || (distance != null && (!Number.isFinite(distance) || distance < 0 || distance > 99999999.9))) {
        return res.status(422).json({ error: { message: 'Travel distance or duration is invalid' } });
      }
      try {
        const saved = await pool.query(`INSERT INTO show_travel_plans
            (show_id,entity_id,transport_mode,departure_at,arrival_at,duration_minutes,distance_miles,border_notes,
             ferry_notes,tolls_vignettes_notes,low_emission_zone_notes,parking_access_notes,driver_notes,updated_by)
          SELECT show_record.id,show_record.entity_id,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::uuid
          FROM shows show_record WHERE show_record.id=$1::uuid AND show_record.entity_id::text=$2::text
          ON CONFLICT (show_id) DO UPDATE SET entity_id=EXCLUDED.entity_id,
            transport_mode=CASE WHEN $15::jsonb ? 'transportMode' THEN EXCLUDED.transport_mode ELSE show_travel_plans.transport_mode END,
            departure_at=CASE WHEN $15::jsonb ? 'departureAt' THEN EXCLUDED.departure_at ELSE show_travel_plans.departure_at END,
            arrival_at=CASE WHEN $15::jsonb ? 'arrivalAt' THEN EXCLUDED.arrival_at ELSE show_travel_plans.arrival_at END,
            duration_minutes=CASE WHEN $15::jsonb ? 'durationMinutes' THEN EXCLUDED.duration_minutes ELSE show_travel_plans.duration_minutes END,
            distance_miles=CASE WHEN $15::jsonb ? 'distanceMiles' THEN EXCLUDED.distance_miles ELSE show_travel_plans.distance_miles END,
            border_notes=CASE WHEN $15::jsonb ? 'borderNotes' THEN EXCLUDED.border_notes ELSE show_travel_plans.border_notes END,
            ferry_notes=CASE WHEN $15::jsonb ? 'ferryNotes' THEN EXCLUDED.ferry_notes ELSE show_travel_plans.ferry_notes END,
            tolls_vignettes_notes=CASE WHEN $15::jsonb ? 'tollsVignettesNotes' THEN EXCLUDED.tolls_vignettes_notes ELSE show_travel_plans.tolls_vignettes_notes END,
            low_emission_zone_notes=CASE WHEN $15::jsonb ? 'lowEmissionZoneNotes' THEN EXCLUDED.low_emission_zone_notes ELSE show_travel_plans.low_emission_zone_notes END,
            parking_access_notes=CASE WHEN $15::jsonb ? 'parkingAccessNotes' THEN EXCLUDED.parking_access_notes ELSE show_travel_plans.parking_access_notes END,
            driver_notes=CASE WHEN $15::jsonb ? 'driverNotes' THEN EXCLUDED.driver_notes ELSE show_travel_plans.driver_notes END,
            updated_by=EXCLUDED.updated_by,updated_at=NOW() RETURNING show_id`,
        [req.params.id, req.entityId, mode, departure.value, arrival.value, duration, distance,
          cleanText(body.borderNotes, 2000), cleanText(body.ferryNotes, 2000), cleanText(body.tollsVignettesNotes, 2000),
          cleanText(body.lowEmissionZoneNotes, 2000), cleanText(body.parkingAccessNotes, 2000), cleanText(body.driverNotes, 2000),
          req.userId, JSON.stringify(body)]);
        if (!saved.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      } catch (error) {
        if (error.code === '23514') return res.status(422).json({ error: { message: 'Arrival cannot be before departure' } });
        throw error;
      }
      return res.json({ saved: true });
    }

    if (body.section === 'accommodation') {
      const financialKeys = ['payer', 'outstandingBalance', 'currency'];
      if (req.isExternalDaySheetCollaborator && financialKeys.some((key) => own(body, key))
        && req.daySheetPermissions?.financialAccess !== 'edit') {
        return res.status(403).json({ error: { message: 'This invitation cannot edit accommodation finances' } });
      }
      const balance = numberOrNull(body.outstandingBalance);
      const checkIn = instant(body.checkInAt);
      const checkOut = instant(body.checkOutAt);
      const confirmationUrl = safeUrl(body.confirmationUrl);
      const code = currencyCode(body.currency);
      if (!checkIn.valid || !checkOut.valid) return res.status(422).json({ error: { message: 'Enter valid check-in and check-out times with a timezone' } });
      if (checkIn.value && checkOut.value && Date.parse(checkOut.value) <= Date.parse(checkIn.value)) return res.status(422).json({ error: { message: 'Check-out must be after check-in' } });
      if (own(body, 'currency') && body.currency !== '' && !code) return res.status(422).json({ error: { message: 'Use a valid three-letter currency code' } });
      if (own(body, 'confirmationUrl') && body.confirmationUrl !== '' && !confirmationUrl) return res.status(422).json({ error: { message: 'Confirmation link must be a valid http or https address' } });
      if (balance != null && (!Number.isFinite(balance) || balance < 0 || balance > 9999999999.99)) return res.status(422).json({ error: { message: 'Outstanding balance is invalid' } });
      try {
        const saved = await pool.query(`INSERT INTO show_accommodations
            (show_id,entity_id,hotel_name,address,booking_reference,check_in_at,check_out_at,rooming_notes,
             breakfast_notes,parking_notes,payer,outstanding_balance,currency,confirmation_url,updated_by)
          SELECT show_record.id,show_record.entity_id,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::uuid
          FROM shows show_record WHERE show_record.id=$1::uuid AND show_record.entity_id::text=$2::text
          ON CONFLICT (show_id) DO UPDATE SET entity_id=EXCLUDED.entity_id,
            hotel_name=CASE WHEN $16::jsonb ? 'hotelName' THEN EXCLUDED.hotel_name ELSE show_accommodations.hotel_name END,
            address=CASE WHEN $16::jsonb ? 'address' THEN EXCLUDED.address ELSE show_accommodations.address END,
            booking_reference=CASE WHEN $16::jsonb ? 'bookingReference' THEN EXCLUDED.booking_reference ELSE show_accommodations.booking_reference END,
            check_in_at=CASE WHEN $16::jsonb ? 'checkInAt' THEN EXCLUDED.check_in_at ELSE show_accommodations.check_in_at END,
            check_out_at=CASE WHEN $16::jsonb ? 'checkOutAt' THEN EXCLUDED.check_out_at ELSE show_accommodations.check_out_at END,
            rooming_notes=CASE WHEN $16::jsonb ? 'roomingNotes' THEN EXCLUDED.rooming_notes ELSE show_accommodations.rooming_notes END,
            breakfast_notes=CASE WHEN $16::jsonb ? 'breakfastNotes' THEN EXCLUDED.breakfast_notes ELSE show_accommodations.breakfast_notes END,
            parking_notes=CASE WHEN $16::jsonb ? 'parkingNotes' THEN EXCLUDED.parking_notes ELSE show_accommodations.parking_notes END,
            payer=CASE WHEN $16::jsonb ? 'payer' THEN EXCLUDED.payer ELSE show_accommodations.payer END,
            outstanding_balance=CASE WHEN $16::jsonb ? 'outstandingBalance' THEN EXCLUDED.outstanding_balance ELSE show_accommodations.outstanding_balance END,
            currency=CASE WHEN $16::jsonb ? 'currency' THEN EXCLUDED.currency ELSE show_accommodations.currency END,
            confirmation_url=CASE WHEN $16::jsonb ? 'confirmationUrl' THEN EXCLUDED.confirmation_url ELSE show_accommodations.confirmation_url END,
            updated_by=EXCLUDED.updated_by,updated_at=NOW() RETURNING show_id`,
        [req.params.id, req.entityId, cleanText(body.hotelName, 200), cleanText(body.address, 500),
          cleanText(body.bookingReference, 160), checkIn.value, checkOut.value, cleanText(body.roomingNotes, 3000),
          cleanText(body.breakfastNotes, 2000), cleanText(body.parkingNotes, 2000), cleanText(body.payer, 160),
          balance, code, confirmationUrl, req.userId, JSON.stringify(body)]);
        if (!saved.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      } catch (error) {
        if (error.code === '23514') return res.status(422).json({ error: { message: 'Check-out must be after check-in' } });
        throw error;
      }
      return res.json({ saved: true });
    }

    if (body.section === 'flight') {
      const statuses = new Set(['not_booked', 'planned', 'booked']);
      const bookingStatus = statuses.has(body.bookingStatus) ? body.bookingStatus : null;
      const flightDate = body.flightDate ? normalizedDate(body.flightDate) : null;
      const flightNumber = body.flightNumber ? normalizedFlightNumber(body.flightNumber) : null;
      const scheduledDeparture = instant(body.scheduledDeparture);
      const scheduledArrival = instant(body.scheduledArrival);
      const departureIata = String(body.departureIata || '').trim().toUpperCase() || null;
      const arrivalIata = String(body.arrivalIata || '').trim().toUpperCase() || null;
      if (!bookingStatus) return res.status(422).json({ error: { message: 'Choose whether a flight is booked' } });
      if (body.flightDate && !flightDate) return res.status(422).json({ error: { message: 'Enter a valid flight date' } });
      if (body.flightNumber && !flightNumber) return res.status(422).json({ error: { message: 'Enter a valid flight number, for example BA283' } });
      if (!scheduledDeparture.valid || !scheduledArrival.valid) return res.status(422).json({ error: { message: 'Enter valid flight times with a timezone' } });
      if (scheduledDeparture.value && scheduledArrival.value && Date.parse(scheduledArrival.value) < Date.parse(scheduledDeparture.value)) return res.status(422).json({ error: { message: 'Flight arrival cannot be before departure' } });
      if ((departureIata && !/^[A-Z]{3}$/.test(departureIata)) || (arrivalIata && !/^[A-Z]{3}$/.test(arrivalIata))) return res.status(422).json({ error: { message: 'Airport codes must contain three letters' } });
      if (bookingStatus === 'booked' && (!flightDate || !flightNumber)) return res.status(422).json({ error: { message: 'A booked flight needs a flight number and date' } });
      const saved = await pool.query(`INSERT INTO show_flight_bookings
          (show_id,entity_id,booking_status,flight_date,flight_number,airline,departure_airport,departure_iata,
           scheduled_departure,arrival_airport,arrival_iata,scheduled_arrival,provider,provider_flight_id,
           booking_reference,notes,updated_by)
        SELECT show_record.id,show_record.entity_id,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::uuid
        FROM shows show_record WHERE show_record.id=$1::uuid AND show_record.entity_id::text=$2::text
        ON CONFLICT (show_id) DO UPDATE SET entity_id=EXCLUDED.entity_id,booking_status=EXCLUDED.booking_status,
          flight_date=EXCLUDED.flight_date,flight_number=EXCLUDED.flight_number,airline=EXCLUDED.airline,
          departure_airport=EXCLUDED.departure_airport,departure_iata=EXCLUDED.departure_iata,
          scheduled_departure=EXCLUDED.scheduled_departure,arrival_airport=EXCLUDED.arrival_airport,
          arrival_iata=EXCLUDED.arrival_iata,scheduled_arrival=EXCLUDED.scheduled_arrival,
          provider=EXCLUDED.provider,provider_flight_id=EXCLUDED.provider_flight_id,
          booking_reference=EXCLUDED.booking_reference,notes=EXCLUDED.notes,updated_by=EXCLUDED.updated_by,updated_at=NOW()
        RETURNING show_id`, [req.params.id, req.entityId, bookingStatus, flightDate, flightNumber,
        cleanText(body.airline, 160), cleanText(body.departureAirport, 160), departureIata,
        scheduledDeparture.value, cleanText(body.arrivalAirport, 160), arrivalIata,
        scheduledArrival.value, cleanText(body.provider, 40), cleanText(body.providerFlightId, 200),
        cleanText(body.bookingReference, 160), cleanText(body.notes, 2000), req.userId]);
      if (!saved.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      return res.json({ saved: true });
    }

    res.status(422).json({ error: { message: 'Choose travel, accommodation or flight details' } });
  });

  return router;
}

module.exports = { createShowLogisticsRouter, derivedTravel, instant, safeUrl, hasRecordedJourney };
