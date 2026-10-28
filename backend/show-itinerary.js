const express = require('express');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORIES = new Set(['call', 'travel', 'border', 'flight', 'ferry', 'accommodation', 'production', 'performance', 'meal', 'other']);
const cleanText = (value, maximum) => value == null || value === '' ? null : String(value).trim().slice(0, maximum);
const validTime = (value) => value == null || value === '' || /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(value));
const canEdit = (req) => !req.isExternalDaySheetCollaborator || ['advance', 'full'].includes(req.daySheetPermissions?.editScope);
const requestBody = (req) => req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};

function minutes(value) {
  if (!value) return null;
  const [hour, minute] = String(value).split(':').map(Number);
  return hour * 60 + minute;
}

function systemEvents(show) {
  const startMinutes = minutes(show.start_time);
  const finishMinutes = minutes(show.end_time);
  const overnightFinish = startMinutes != null && finishMinutes != null && startMinutes >= 18 * 60 && finishMinutes <= 6 * 60;
  return [
    ['load_in', 'Load-in', 'production', show.load_in_time, 0],
    ['soundcheck', 'Soundcheck', 'production', show.sound_check_time, 0],
    ['doors', 'Doors', 'production', show.door_time, 0],
    ['on_stage', 'On stage', 'performance', show.start_time, 0],
    ['finish', 'Finish', 'performance', show.end_time, overnightFinish ? 1 : 0],
  ].filter((event) => event[3]).map(([key, title, category, time, dayOffset], index) => ({
    id: `system-${key}`, title, category, day_offset: dayOffset, event_time: String(time).slice(0, 8),
    end_time: null, location: show.venue_name || show.city || null, responsible_person: null,
    notes: null, sort_order: 100 + index, system: true,
  }));
}

function createShowItineraryRouter(pool) {
  const router = express.Router();

  router.use('/shows/:id/itinerary', (req, res, next) => {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: { message: 'Invalid show ID' } });
    next();
  });

  router.get('/shows/:id/itinerary', async (req, res) => {
    const showResult = await pool.query(`SELECT id, venue_name, city, load_in_time, sound_check_time, door_time, start_time, end_time
      FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text`, [req.params.id, req.entityId]);
    if (!showResult.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
    const custom = await pool.query(`SELECT event.id, event.title, event.category, event.day_offset, event.event_time,
        event.end_time, event.location, event.responsible_person, event.notes, event.sort_order, FALSE system
      FROM show_itinerary_events event JOIN shows show_record ON show_record.id=event.show_id
      WHERE event.show_id=$1::uuid AND show_record.entity_id::text=$2::text AND event.archived_at IS NULL`,
    [req.params.id, req.entityId]);
    const events = [...systemEvents(showResult.rows[0]), ...custom.rows].sort((left, right) =>
      left.day_offset - right.day_offset
      || String(left.event_time || '99:99').localeCompare(String(right.event_time || '99:99'))
      || left.sort_order - right.sort_order);
    res.json({ events });
  });

  router.post('/shows/:id/itinerary', async (req, res) => {
    if (!canEdit(req)) return res.status(403).json({ error: { message: 'This invitation cannot edit the itinerary' } });
    const body = requestBody(req);
    const title = cleanText(body.title, 160);
    const category = CATEGORIES.has(body.category) ? body.category : 'other';
    const dayOffset = body.dayOffset === undefined || body.dayOffset === '' ? 0 : Number(body.dayOffset);
    if (!title) return res.status(422).json({ error: { message: 'Event title is required' } });
    if (!Number.isInteger(dayOffset) || dayOffset < -7 || dayOffset > 7) return res.status(422).json({ error: { message: 'Event day is invalid' } });
    if (!validTime(body.eventTime) || !validTime(body.endTime)) return res.status(422).json({ error: { message: 'Event time is invalid' } });
    const result = await pool.query(`INSERT INTO show_itinerary_events
        (entity_id, show_id, title, category, day_offset, event_time, end_time, location, responsible_person, notes, sort_order, created_by)
      SELECT show_record.entity_id, show_record.id, $3, $4, $5, $6::time, $7::time, $8, $9, $10,
        COALESCE((SELECT max(sort_order)+10 FROM show_itinerary_events WHERE show_id=show_record.id),10), $11::uuid
      FROM shows show_record WHERE show_record.id=$2::uuid AND show_record.entity_id::text=$1::text RETURNING *`,
    [req.entityId, req.params.id, title, category, dayOffset, body.eventTime || null, body.endTime || null,
      cleanText(body.location, 300), cleanText(body.responsiblePerson, 120), cleanText(body.notes, 3000), req.userId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
    res.status(201).json({ event: result.rows[0] });
  });

  router.patch('/shows/:id/itinerary/:eventId', async (req, res) => {
    if (!UUID.test(req.params.eventId)) return res.status(400).json({ error: { message: 'Invalid itinerary record' } });
    if (!canEdit(req)) return res.status(403).json({ error: { message: 'This invitation cannot edit the itinerary' } });
    const body = requestBody(req);
    if (body.archived === true) {
      const archived = await pool.query(`UPDATE show_itinerary_events event SET archived_at=NOW(), updated_at=NOW()
        FROM shows show_record WHERE event.id=$3::uuid AND event.show_id=$2::uuid AND show_record.id=event.show_id
          AND show_record.entity_id::text=$1::text AND event.archived_at IS NULL RETURNING event.id`,
      [req.entityId, req.params.id, req.params.eventId]);
      return archived.rowCount ? res.json({ archived: true }) : res.status(404).json({ error: { message: 'Itinerary event not found' } });
    }
    const title = body.title === undefined ? null : cleanText(body.title, 160);
    const category = body.category === undefined ? null : body.category;
    const dayOffset = body.dayOffset === undefined ? null : Number(body.dayOffset);
    if (body.title !== undefined && !title) return res.status(422).json({ error: { message: 'Event title is required' } });
    if (category !== null && !CATEGORIES.has(category)) return res.status(422).json({ error: { message: 'Event category is invalid' } });
    if (dayOffset !== null && (!Number.isInteger(dayOffset) || dayOffset < -7 || dayOffset > 7)) return res.status(422).json({ error: { message: 'Event day is invalid' } });
    if (!validTime(body.eventTime) || !validTime(body.endTime)) return res.status(422).json({ error: { message: 'Event time is invalid' } });
    const result = await pool.query(`UPDATE show_itinerary_events event SET
        title=CASE WHEN $4::boolean THEN $5 ELSE event.title END,
        category=CASE WHEN $6::boolean THEN $7 ELSE event.category END,
        day_offset=CASE WHEN $8::boolean THEN $9 ELSE event.day_offset END,
        event_time=CASE WHEN $10::boolean THEN $11::time ELSE event.event_time END,
        end_time=CASE WHEN $12::boolean THEN $13::time ELSE event.end_time END,
        location=CASE WHEN $14::boolean THEN $15 ELSE event.location END,
        responsible_person=CASE WHEN $16::boolean THEN $17 ELSE event.responsible_person END,
        notes=CASE WHEN $18::boolean THEN $19 ELSE event.notes END, updated_at=NOW()
      FROM shows show_record WHERE event.id=$3::uuid AND event.show_id=$2::uuid AND show_record.id=event.show_id
        AND show_record.entity_id::text=$1::text AND event.archived_at IS NULL RETURNING event.*`,
    [req.entityId, req.params.id, req.params.eventId,
      body.title !== undefined, title,
      body.category !== undefined, category,
      body.dayOffset !== undefined, dayOffset,
      body.eventTime !== undefined, body.eventTime || null,
      body.endTime !== undefined, body.endTime || null,
      body.location !== undefined, cleanText(body.location, 300),
      body.responsiblePerson !== undefined, cleanText(body.responsiblePerson, 120),
      body.notes !== undefined, cleanText(body.notes, 3000)]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Itinerary event not found' } });
    res.json({ event: result.rows[0] });
  });

  return router;
}

module.exports = { createShowItineraryRouter, systemEvents };
