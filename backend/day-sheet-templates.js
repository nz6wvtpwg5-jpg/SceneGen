/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS = new Set(['show_day', 'travel_day', 'festival_day', 'off_day']);
const CATEGORIES = new Set(['call', 'travel', 'border', 'flight', 'ferry', 'accommodation', 'production', 'performance', 'meal', 'other']);
const time = value => value ? String(value).slice(0, 5) : null;
const clean = (value, max) => value == null || value === '' ? null : String(value).trim().slice(0, max);

const BUILT_INS = [
  { id: 'builtin-show-day', name: 'Show day', templateKind: 'show_day', builtIn: true,
    loadInTime: '15:00', soundCheckTime: '17:00', doorTime: '19:00', startTime: '20:00', endTime: '22:30',
    events: [{ title: 'Crew call', category: 'call', dayOffset: 0, eventTime: '14:30' }, { title: 'Evening meal', category: 'meal', dayOffset: 0, eventTime: '18:00' }] },
  { id: 'builtin-travel-day', name: 'Travel day', templateKind: 'travel_day', builtIn: true,
    events: [{ title: 'Vehicle call', category: 'call', dayOffset: 0, eventTime: '09:00' }, { title: 'Depart', category: 'travel', dayOffset: 0, eventTime: '09:30' }, { title: 'Meal / fuel stop', category: 'meal', dayOffset: 0, eventTime: '13:00' }, { title: 'Expected arrival', category: 'travel', dayOffset: 0, eventTime: '16:30' }, { title: 'Hotel check-in', category: 'accommodation', dayOffset: 0, eventTime: '17:00' }] },
  { id: 'builtin-festival-day', name: 'Festival day', templateKind: 'festival_day', builtIn: true,
    loadInTime: '12:00', soundCheckTime: '14:00', startTime: '18:00', endTime: '19:00',
    events: [{ title: 'Accreditation', category: 'production', dayOffset: 0, eventTime: '11:00' }, { title: 'Production office check-in', category: 'production', dayOffset: 0, eventTime: '11:30' }, { title: 'Backline ready', category: 'production', dayOffset: 0, eventTime: '13:00' }] },
  { id: 'builtin-off-day', name: 'Off day', templateKind: 'off_day', builtIn: true,
    events: [{ title: 'Laundry / supplies', category: 'other', dayOffset: 0, eventTime: '11:00' }, { title: 'Tour administration', category: 'other', dayOffset: 0, eventTime: '14:00' }] },
];

function templateKindForShow(show) {
  if (show.show_type === 'travel_day') return 'travel_day';
  if (show.show_type === 'off_day') return 'off_day';
  return /festival/i.test(`${show.venue_name || ''} ${show.notes || ''}`) ? 'festival_day' : 'show_day';
}

function normalizeTemplate(row, events = []) {
  return {
    id: row.id, name: row.name, templateKind: row.template_kind, builtIn: false,
    loadInTime: time(row.load_in_time), soundCheckTime: time(row.sound_check_time), doorTime: time(row.door_time),
    startTime: time(row.start_time), endTime: time(row.end_time), events: events.map(event => ({
      title: event.title, category: event.category, dayOffset: Number(event.day_offset), eventTime: time(event.event_time),
      endTime: time(event.end_time), location: event.location, responsiblePerson: event.responsible_person, notes: event.notes,
    })),
  };
}

async function loadTemplate(client, entityId, templateId) {
  const builtIn = BUILT_INS.find(template => template.id === templateId);
  if (builtIn) return builtIn;
  if (!UUID.test(templateId)) return null;
  const result = await client.query('SELECT * FROM day_sheet_templates WHERE id=$1::uuid AND entity_id=$2::uuid', [templateId, entityId]);
  if (!result.rowCount) return null;
  const events = await client.query('SELECT * FROM day_sheet_template_events WHERE template_id=$1::uuid ORDER BY day_offset,event_time NULLS LAST,sort_order', [templateId]);
  return normalizeTemplate(result.rows[0], events.rows);
}

async function applyTemplate(client, entityId, showId, template, mode, userId) {
  const replace = mode === 'replace';
  const updated = await client.query(`UPDATE shows SET
      load_in_time=CASE WHEN $3 AND $4::time IS NOT NULL THEN $4::time ELSE COALESCE(load_in_time,$4::time) END,
      sound_check_time=CASE WHEN $3 AND $5::time IS NOT NULL THEN $5::time ELSE COALESCE(sound_check_time,$5::time) END,
      door_time=CASE WHEN $3 AND $6::time IS NOT NULL THEN $6::time ELSE COALESCE(door_time,$6::time) END,
      start_time=CASE WHEN $3 AND $7::time IS NOT NULL THEN $7::time ELSE COALESCE(start_time,$7::time) END,
      end_time=CASE WHEN $3 AND $8::time IS NOT NULL THEN $8::time ELSE COALESCE(end_time,$8::time) END, updated_at=NOW()
    WHERE id=$1::uuid AND entity_id::text=$2::text RETURNING id`, [showId, entityId, replace,
    template.loadInTime || null, template.soundCheckTime || null, template.doorTime || null, template.startTime || null, template.endTime || null]);
  if (!updated.rowCount) return false;
  if (replace) await client.query('UPDATE show_itinerary_events SET archived_at=NOW(),updated_at=NOW() WHERE show_id=$1::uuid AND entity_id::text=$2::text AND archived_at IS NULL', [showId, entityId]);
  for (const [index, event] of (template.events || []).entries()) {
    if (!CATEGORIES.has(event.category)) continue;
    await client.query(`INSERT INTO show_itinerary_events
        (entity_id,show_id,title,category,day_offset,event_time,end_time,location,responsible_person,notes,sort_order,created_by)
      SELECT $1,$2::uuid,$3,$4,$5,$6::time,$7::time,$8,$9,$10,$11,$12::uuid
      WHERE $13 OR NOT EXISTS (SELECT 1 FROM show_itinerary_events existing WHERE existing.show_id=$2::uuid
        AND existing.entity_id::text=$1::text AND existing.archived_at IS NULL AND lower(existing.title)=lower($3) AND existing.day_offset=$5
        AND existing.event_time IS NOT DISTINCT FROM $6::time)`, [entityId, showId, clean(event.title,160), event.category,
      Number(event.dayOffset) || 0, event.eventTime || null, event.endTime || null, clean(event.location,300),
      clean(event.responsiblePerson,120), clean(event.notes,3000), (index + 1) * 10, userId, replace]);
  }
  return true;
}

function shifted(value, delta) {
  if (!value) return { value: null, days: 0 };
  const [hours, minutes] = String(value).slice(0,5).split(':').map(Number);
  const total = hours * 60 + minutes + delta;
  const days = Math.floor(total / 1440);
  const wrapped = ((total % 1440) + 1440) % 1440;
  return { value: `${String(Math.floor(wrapped / 60)).padStart(2,'0')}:${String(wrapped % 60).padStart(2,'0')}`, days };
}

function createDaySheetTemplateRouter(pool) {
  const router = express.Router();

  router.get('/day-sheet-templates', async (req, res) => {
    if (!req.entityId || req.isExternalDaySheetCollaborator) return res.status(403).json({ error: { message: 'Templates are available to organisation members only' } });
    const templates = await pool.query('SELECT * FROM day_sheet_templates WHERE entity_id=$1::uuid ORDER BY lower(name)', [req.entityId]);
    const ids = templates.rows.map(row => row.id);
    const events = ids.length ? await pool.query('SELECT * FROM day_sheet_template_events WHERE template_id=ANY($1::uuid[]) ORDER BY day_offset,event_time NULLS LAST,sort_order', [ids]) : { rows: [] };
    const custom = templates.rows.map(row => normalizeTemplate(row, events.rows.filter(event => String(event.template_id) === String(row.id))));
    let recommendedKind = 'show_day';
    if (req.query.showId && UUID.test(String(req.query.showId))) {
      const show = await pool.query('SELECT show_type,venue_name,notes FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text', [req.query.showId, req.entityId]);
      if (show.rowCount) recommendedKind = templateKindForShow(show.rows[0]);
    }
    res.json({ templates: [...BUILT_INS, ...custom], recommendedKind });
  });

  router.post('/day-sheet-templates', async (req, res) => {
    if (!req.entityId || req.isExternalDaySheetCollaborator) return res.status(403).json({ error: { message: 'Templates are available to organisation members only' } });
    const name = clean(req.body.name, 120);
    const showId = String(req.body.showId || '');
    const requestedKind = KINDS.has(req.body.templateKind) ? req.body.templateKind : null;
    if (!name || !UUID.test(showId)) return res.status(422).json({ error: { message: 'Template name and source show are required' } });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const show = await client.query('SELECT * FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text FOR SHARE', [showId, req.entityId]);
      if (!show.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Source show not found' } }); }
      const kind = requestedKind || templateKindForShow(show.rows[0]);
      const created = await client.query(`INSERT INTO day_sheet_templates
        (entity_id,name,template_kind,load_in_time,sound_check_time,door_time,start_time,end_time,created_by)
        VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9::uuid) RETURNING *`, [req.entityId,name,kind,show.rows[0].load_in_time,
        show.rows[0].sound_check_time,show.rows[0].door_time,show.rows[0].start_time,show.rows[0].end_time,req.userId]);
      await client.query(`INSERT INTO day_sheet_template_events
        (template_id,title,category,day_offset,event_time,end_time,location,responsible_person,notes,sort_order)
        SELECT $1::uuid,title,category,day_offset,event_time,end_time,location,responsible_person,notes,sort_order
        FROM show_itinerary_events WHERE show_id=$2::uuid AND entity_id::text=$3::text AND archived_at IS NULL`, [created.rows[0].id,showId,req.entityId]);
      await client.query('COMMIT');
      res.status(201).json({ template: normalizeTemplate(created.rows[0]) });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error.code === '23505') return res.status(409).json({ error: { message: 'A template with that name already exists' } });
      throw error;
    } finally { client.release(); }
  });

  router.delete('/day-sheet-templates/:id', async (req, res) => {
    if (!UUID.test(req.params.id) || req.isExternalDaySheetCollaborator) return res.status(404).json({ error: { message: 'Template not found' } });
    const result = await pool.query('DELETE FROM day_sheet_templates WHERE id=$1::uuid AND entity_id=$2::uuid RETURNING id', [req.params.id,req.entityId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Template not found' } });
    res.json({ deleted: true });
  });

  router.post('/day-sheet-templates/:id/apply', async (req, res) => {
    if (req.isExternalDaySheetCollaborator) return res.status(403).json({ error: { message: 'Templates are available to organisation members only' } });
    const showId = String(req.body.showId || '');
    const mode = req.body.mode === 'replace' ? 'replace' : 'fill_empty';
    if (!UUID.test(showId)) return res.status(422).json({ error: { message: 'Target show is required' } });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const template = await loadTemplate(client, req.entityId, req.params.id);
      if (!template) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Template not found' } }); }
      if (!await applyTemplate(client,req.entityId,showId,template,mode,req.userId)) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Target show not found' } }); }
      await client.query('COMMIT');
      res.json({ applied: true, mode });
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; } finally { client.release(); }
  });

  router.post('/shows/:id/schedule/copy', async (req, res) => {
    if (req.isExternalDaySheetCollaborator) return res.status(403).json({ error: { message: 'Schedule copying is available to organisation members only' } });
    const sourceShowId = String(req.body.sourceShowId || '');
    if (!UUID.test(req.params.id) || !UUID.test(sourceShowId) || sourceShowId === req.params.id) return res.status(422).json({ error: { message: 'Choose a different source show' } });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const source = await client.query('SELECT * FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text', [sourceShowId,req.entityId]);
      if (!source.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Source show not found' } }); }
      const events = await client.query('SELECT * FROM show_itinerary_events WHERE show_id=$1::uuid AND entity_id::text=$2::text AND archived_at IS NULL ORDER BY sort_order', [sourceShowId,req.entityId]);
      const template = normalizeTemplate({ ...source.rows[0], template_kind: templateKindForShow(source.rows[0]), name: 'Copied schedule' }, events.rows);
      if (!await applyTemplate(client,req.entityId,req.params.id,template,req.body.mode === 'replace' ? 'replace' : 'fill_empty',req.userId)) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Target show not found' } }); }
      await client.query('COMMIT'); res.json({ copied: true });
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; } finally { client.release(); }
  });

  router.post('/shows/:id/schedule/shift', async (req, res) => {
    if (req.isExternalDaySheetCollaborator) return res.status(403).json({ error: { message: 'Schedule shifting is available to organisation members only' } });
    const delta = Number(req.body.minutes);
    if (!UUID.test(req.params.id) || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 720) return res.status(422).json({ error: { message: 'Shift must be a whole number from -720 to 720 minutes' } });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const show = await client.query('SELECT * FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text FOR UPDATE', [req.params.id,req.entityId]);
      if (!show.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Show not found' } }); }
      const fields = ['load_in_time','sound_check_time','door_time','start_time','end_time'];
      const values = fields.map(field => shifted(show.rows[0][field],delta).value);
      await client.query(`UPDATE shows SET load_in_time=$3::time,sound_check_time=$4::time,door_time=$5::time,start_time=$6::time,end_time=$7::time,updated_at=NOW()
        WHERE id=$1::uuid AND entity_id::text=$2::text`, [req.params.id,req.entityId,...values]);
      const events = await client.query('SELECT id,day_offset,event_time,end_time FROM show_itinerary_events WHERE show_id=$1::uuid AND entity_id::text=$2::text AND archived_at IS NULL FOR UPDATE', [req.params.id,req.entityId]);
      for (const event of events.rows) {
        const start = shifted(event.event_time,delta); const finish = shifted(event.end_time,delta);
        const dayOffset = Number(event.day_offset) + start.days;
        if (dayOffset < -7 || dayOffset > 7) throw Object.assign(new Error('A shifted event would fall outside the supported seven-day window'), { status: 422 });
        await client.query('UPDATE show_itinerary_events SET day_offset=$2,event_time=$3::time,end_time=$4::time,updated_at=NOW() WHERE id=$1::uuid', [event.id,dayOffset,start.value,finish.value]);
      }
      await client.query('COMMIT'); res.json({ shifted: true, minutes: delta });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error.status === 422) return res.status(422).json({ error: { message: error.message } });
      throw error;
    } finally { client.release(); }
  });

  return router;
}

module.exports = { createDaySheetTemplateRouter, BUILT_INS, templateKindForShow, shifted, applyTemplate };
