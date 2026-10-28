'use strict';

/**
 * Convert user-selected Google Calendar entries to SceneGen schedule rows.
 * This handler is intentionally independent of Express so its transaction,
 * workspace isolation and rollback behaviour can be regression-tested.
 */
const { userShowNotes } = require('./calendar-import-notes');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MODES = new Set(['standalone', 'new', 'existing']);
const TYPES = new Set(['show', 'off_day', 'travel_day']);

class ImportProblem extends Error {
  constructor(status, code, message, data = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

function cleanText(value, max = 250) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
    : '';
}

function parseDate(value) {
  if (typeof value !== 'string' || !DATE.test(value)) return null;
  const parsed = new Date(value + 'T12:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value : null;
}

function validateImport(body) {
  const mode = body?.mode || (body?.tourId ? 'existing' : 'new');
  if (!MODES.has(mode)) throw new ImportProblem(422, 'INVALID_MODE', 'Choose standalone, new tour or an existing tour.');
  const tourName = cleanText(body?.name, 161);
  if (mode === 'new' && (!tourName || tourName.length > 160)) {
    throw new ImportProblem(422, 'TOUR_NAME_REQUIRED', 'Enter a tour name (up to 160 characters).');
  }
  if (mode === 'existing' && !UUID.test(String(body?.tourId || ''))) {
    throw new ImportProblem(422, 'INVALID_TOUR', 'Choose a valid tour.');
  }
  if (!Array.isArray(body?.events) || !body.events.length || body.events.length > 40) {
    throw new ImportProblem(422, 'INVALID_SELECTION', 'Select between 1 and 40 calendar dates.');
  }

  const entries = [];
  const selectedSources = new Set();
  const selectedShows = new Set();
  for (const item of body.events) {
    const sourceId = cleanText(item?.sourceId, 241);
    const date = parseDate(item?.date);
    const startTime = item?.startTime || '20:00';
    const showType = item?.showType || 'show';
    const title = cleanText(item?.summary || item?.title, 250);
    const venueName = cleanText(item?.venueName, 180);
    const city = cleanText(item?.city, 120);
    const country = cleanText(item?.country, 120);

    if (!sourceId || sourceId.length > 240 || /[\[\]\r\n]/.test(sourceId) ||
        !date || typeof startTime !== 'string' || !CLOCK.test(startTime) ||
        !TYPES.has(showType) || !title && !venueName) {
      throw new ImportProblem(422, 'INVALID_ENTRY', 'Confirm the description, date and time for each calendar entry.');
    }

    const sourceKey = sourceId + '|' + date;
    const showKey = [date, venueName.toLowerCase(), city.toLowerCase()].join('|');
    if (selectedSources.has(sourceKey) ||
        (showType === 'show' && venueName && city && selectedShows.has(showKey))) {
      throw new ImportProblem(422, 'DUPLICATE_SELECTION', 'The same performance was selected more than once.');
    }
    selectedSources.add(sourceKey);
    if (showType === 'show' && venueName && city) selectedShows.add(showKey);
    entries.push({ sourceId, date, startTime, showType, title, venueName, city, country });
  }

  return { mode, name: tourName, tourId: mode === 'existing' ? body.tourId : null, entries };
}

function createCalendarImportHandler({ pool, upsertVenue, canonicalCountry, toCamelCase }) {
  if (!pool || !upsertVenue || !canonicalCountry || !toCamelCase) throw new Error('Missing calendar import dependency');

  return async function importCalendar(req, res) {
    let input;
    try {
      if (!UUID.test(String(req.entityId || ''))) {
        throw new ImportProblem(400, 'WORKSPACE_REQUIRED', 'Choose your SceneGen workspace first.');
      }
      input = validateImport(req.body);
    } catch (error) {
      if (error instanceof ImportProblem) {
        return res.status(error.status).json({ error: { code: error.code, message: error.message } });
      }
      throw error;
    }

    let client;
    let began = false;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      began = true;
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['calendar-import:' + req.entityId]);

      const ordered = [...input.entries].sort((a, b) => a.date.localeCompare(b.date));
      let tour = null;
      if (input.mode === 'existing') {
        const selected = await client.query(
          'SELECT id,name,start_date,end_date FROM tours WHERE id=$1::uuid AND entity_id=$2::text FOR UPDATE',
          [input.tourId, req.entityId]);
        if (!selected.rowCount) {
          throw new ImportProblem(404, 'TOUR_NOT_FOUND', 'That tour is no longer available in this workspace.');
        }
        tour = selected.rows[0];
      }

      for (const row of ordered) {
        // Calendar source is a first-class relationship, rather than parsing
        // a free-text notes field. Check legacy note-only imports too.
        const linked = await client.query(
          'SELECT cis.show_id AS id,s.tour_id FROM calendar_import_sources cis ' +
          'JOIN shows s ON s.id=cis.show_id WHERE cis.entity_id=$1::uuid ' +
          "AND cis.provider='google' AND cis.event_id=$2 AND cis.event_date=$3::date LIMIT 1",
          [req.entityId, row.sourceId, row.date]);
        const legacy = linked.rowCount ? linked : await client.query(
          'SELECT id,tour_id FROM shows WHERE entity_id=$1::text AND date=$2::date ' +
          'AND (position($3 IN COALESCE(notes,\'\'))>0 OR ' +
          "($4::text<>'' AND $5::text<>'' AND lower(trim(coalesce(venue_name,'')))=lower($4) " +
          "AND lower(trim(coalesce(city,'')))=lower($5) AND coalesce(show_type,'show')='show' AND $6::text='show')) LIMIT 1",
          [req.entityId, row.date, '[Google Calendar event: ' + row.sourceId + ']',
            row.venueName, row.city, row.showType]);

        if (legacy.rowCount) {
          throw new ImportProblem(409, 'ALREADY_IMPORTED',
            'A matching show already exists on ' + row.date + '. Nothing has been changed.',
            { showId: legacy.rows[0].id, tourId: legacy.rows[0].tour_id });
        }
      }

      if (input.mode === 'new') {
        const created = await client.query(
          "INSERT INTO tours(entity_id,name,start_date,end_date,status) VALUES($1,$2,$3,$4,'planning') " +
          'RETURNING id,name,start_date,end_date',
          [req.entityId, input.name, ordered[0].date, ordered[ordered.length - 1].date]);
        tour = created.rows[0];
      }

      const showIds = [];
      for (const row of ordered) {
        const country = canonicalCountry(row.country) || row.country || null;
        const venue = row.showType === 'show' && row.venueName && row.city
          ? await upsertVenue(client, { venueName: row.venueName, city: row.city, country })
          : null;
        const notes = null; // Calendar source metadata lives in calendar_import_sources.
        const created = await client.query(
          'INSERT INTO shows(entity_id,tour_id,venue_id,venue_name,city,country,date,start_time,' +
          'status,show_type,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
          [req.entityId, tour?.id || null, venue?.id || null,
            row.showType === 'show' ? (venue?.name || row.venueName || null) : null,
            venue?.city || row.city || 'TBD', venue?.country || country,
            row.date, row.startTime, 'tentative', row.showType, notes]);
        const showId = created.rows[0].id;
        await client.query(
          "INSERT INTO calendar_import_sources(entity_id,provider,event_id,event_date,show_id,event_title) " +
          "VALUES($1,'google',$2,$3::date,$4::uuid,$5)",
          [req.entityId, row.sourceId, row.date, showId, row.title]);
        showIds.push(showId);
      }

      if (input.mode === 'existing') {
        const updated = await client.query(
          'UPDATE tours SET start_date=LEAST(start_date,$2::date),' +
          'end_date=GREATEST(end_date,$3::date),updated_at=NOW() ' +
          'WHERE id=$1::uuid AND entity_id=$4::text RETURNING id,name,start_date,end_date',
          [tour.id, ordered[0].date, ordered[ordered.length - 1].date, req.entityId]);
        tour = updated.rows[0];
      }

      // Read back the records under the same transaction before reporting success.
      const saved = await client.query(
        'SELECT count(*)::int AS count FROM shows WHERE entity_id=$1::text ' +
        'AND id = ANY($2::uuid[]) AND tour_id IS NOT DISTINCT FROM $3::uuid',
        [req.entityId, showIds, tour?.id || null]);
      if (saved.rows[0]?.count !== showIds.length) {
        throw new Error('Calendar import read-back verification failed');
      }

      await client.query('COMMIT');
      began = false;
      return res.status(201).json({
        tour: tour ? toCamelCase(tour) : null,
        showIds, showId: showIds.length === 1 ? showIds[0] : null,
        showCount: showIds.length, addedToExistingTour: input.mode === 'existing',
      });
    } catch (error) {
      if (client && began) await client.query('ROLLBACK').catch(() => {});
      if (error instanceof ImportProblem) {
        return res.status(error.status).json({
          error: { code: error.code, message: error.message, ...error.data },
        });
      }
      console.error('Calendar import failed', {
        requestId: req.requestId,
        code: error?.code,
        message: error?.message,
      });
      return res.status(500).json({
        error: { code: 'IMPORT_FAILED', message: 'Calendar import failed. No changes were saved. Please retry.' },
      });
    } finally {
      client?.release();
    }
  };
}

module.exports = { createCalendarImportHandler, validateImport, parseDate, ImportProblem };
