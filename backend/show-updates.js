const express = require('express');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEVERITIES = new Set(['info', 'important', 'urgent']);
const SCOPES = new Set(['show', 'tour']);
const FINANCIAL_FIELDS = new Set(['fee', 'guaranteedFee', 'backendDeal', 'isPaid', 'ticketPrice', 'currency']);
const cleanText = (value, maximum) => value == null || value === '' ? null : String(value).trim().slice(0, maximum);
const label = (value) => String(value || '').replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim().toLowerCase();
const requestBody = (req) => req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
const validDate = (value) => {
  if (value == null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const visibleNoticeSql = `notice.entity_id::text=$1::text
  AND (notice.show_id=$2::uuid OR ($3::uuid IS NOT NULL AND notice.tour_id=$3::uuid))
  AND notice.archived_at IS NULL
  AND (notice.expires_at IS NULL OR notice.expires_at>NOW())`;

function canManage(req) {
  return !req.isExternalDaySheetCollaborator && ['owner', 'admin'].includes(req.entityRole);
}

async function findShow(pool, req) {
  return pool.query('SELECT id,tour_id FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text',
    [req.params.id, req.entityId]);
}

function createShowUpdatesRouter(pool) {
  const router = express.Router();

  router.use('/shows/:id', (req, res, next) => {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: { message: 'Invalid show ID' } });
    next();
  });

  router.get('/shows/:id/updates', async (req, res) => {
    try {
      const showResult = await findShow(pool, req);
      if (!showResult.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      const show = showResult.rows[0];
      const visit = await pool.query('SELECT last_visited_at FROM show_portal_visits WHERE show_id=$1::uuid AND user_id=$2::uuid',
        [show.id, req.userId]);
      const since = visit.rows[0]?.last_visited_at || null;
      const bandMember = req.isExternalDaySheetCollaborator && ['band_member', 'crew_member'].includes(req.daySheetPermissions?.accessRole);
      const [notices, changes, itinerary, advance, travel, accommodation, documents] = await Promise.all([
        pool.query(`SELECT notice.id,notice.title,notice.message,notice.severity,notice.requires_acknowledgement,
            notice.visible_to_collaborators,notice.show_id,notice.tour_id,notice.created_at,notice.expires_at,
            receipt.seen_at,receipt.acknowledged_at,
            COALESCE((SELECT json_agg(json_build_object('name',COALESCE(person.name,person.email),
              'seenAt',notice_receipt.seen_at,'acknowledgedAt',notice_receipt.acknowledged_at)
              ORDER BY notice_receipt.seen_at)
              FROM show_notice_receipts notice_receipt JOIN users person ON person.id=notice_receipt.user_id
              WHERE notice_receipt.notice_id=notice.id),'[]') receipts
          FROM show_notices notice
          LEFT JOIN show_notice_receipts receipt ON receipt.notice_id=notice.id AND receipt.user_id=$4::uuid
          WHERE ${visibleNoticeSql}
            AND ($5::boolean=FALSE OR notice.visible_to_collaborators=TRUE)
          ORDER BY CASE notice.severity WHEN 'urgent' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,notice.created_at DESC`,
        [req.entityId, show.id, show.tour_id, req.userId, Boolean(req.isExternalDaySheetCollaborator)]),
        pool.query(`SELECT changes,COALESCE(reviewed_at,created_at) changed_at FROM day_sheet_changes
          WHERE show_id=$1::uuid AND entity_id::text=$2::text AND status='applied'
            AND ($3::timestamptz IS NULL OR COALESCE(reviewed_at,created_at)>$3::timestamptz)
          ORDER BY changed_at DESC LIMIT 30`, [show.id, req.entityId, since]),
        pool.query(`SELECT title,updated_at FROM show_itinerary_events
          WHERE show_id=$1::uuid AND entity_id::text=$2::text AND archived_at IS NULL
            AND ($3::timestamptz IS NULL OR updated_at>$3::timestamptz)
          ORDER BY updated_at DESC LIMIT 20`, [show.id, req.entityId, since]),
        pool.query(`SELECT title,status,updated_at FROM show_advance_tasks
          WHERE show_id=$1::uuid AND entity_id::text=$2::text
            AND ($3::timestamptz IS NULL OR updated_at>$3::timestamptz)
          ORDER BY updated_at DESC LIMIT 20`, [show.id, req.entityId, since]),
        pool.query(`SELECT updated_at FROM show_travel_plans
          WHERE show_id=$1::uuid AND entity_id::text=$2::text
            AND ($3::timestamptz IS NULL OR updated_at>$3::timestamptz)`, [show.id, req.entityId, since]),
        pool.query(`SELECT updated_at FROM show_accommodations
          WHERE show_id=$1::uuid AND entity_id::text=$2::text
            AND ($3::timestamptz IS NULL OR updated_at>$3::timestamptz)`, [show.id, req.entityId, since]),
        bandMember ? Promise.resolve({ rows: [] }) : pool.query(`SELECT title,visible_to_collaborators,permission_level,created_at FROM tour_documents
          WHERE entity_id::text=$1::text
            AND (show_id=$2::uuid OR ($3::uuid IS NOT NULL AND tour_id=$3::uuid))
            AND ($4::timestamptz IS NULL OR created_at>$4::timestamptz)`, [req.entityId, show.id, show.tour_id, since]),
      ]);
      const hideFinance = req.isExternalDaySheetCollaborator
        && req.daySheetPermissions?.financialAccess === 'hidden';
      const updates = [];
      for (const row of changes.rows) {
        const fields = Object.keys(row.changes || {}).filter((field) => !hideFinance || !FINANCIAL_FIELDS.has(field));
        if (fields.length) updates.push({ type: 'day_sheet', summary: `Day sheet updated: ${fields.map(label).join(', ')}`, at: row.changed_at });
      }
      itinerary.rows.forEach((row) => updates.push({ type: 'itinerary', summary: `Itinerary updated: ${row.title}`, at: row.updated_at }));
      advance.rows.forEach((row) => updates.push({ type: 'advance', summary: `Advancing: ${row.title} is ${label(row.status)}`, at: row.updated_at }));
      travel.rows.forEach((row) => updates.push({ type: 'travel', summary: 'Inbound travel plan updated', at: row.updated_at }));
      accommodation.rows.forEach((row) => updates.push({ type: 'accommodation', summary: 'Accommodation details updated', at: row.updated_at }));
      documents.rows
        .filter((row) => !req.isExternalDaySheetCollaborator || row.visible_to_collaborators)
        .filter((row) => !hideFinance || row.permission_level !== 'financial')
        .forEach((row) => updates.push({ type: 'document', summary: `Document added: ${row.title}`, at: row.created_at }));
      updates.sort((left, right) => Date.parse(right.at) - Date.parse(left.at));
      res.json({
        previousVisit: since,
        updates: updates.slice(0, 50),
        notices: notices.rows.map((notice) => ({
          ...notice,
          receipts: canManage(req) ? notice.receipts : undefined,
        })),
        canManage: canManage(req),
        tourId: show.tour_id || null,
      });
    } catch (error) {
      console.error('Unable to load show updates:', error);
      res.status(500).json({ error: { message: 'Unable to load updates and notices' } });
    }
  });

  router.post('/shows/:id/visit', async (req, res) => {
    try {
      const showResult = await findShow(pool, req);
      if (!showResult.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      const show = showResult.rows[0];
      await pool.query(`INSERT INTO show_portal_visits(show_id,user_id,last_visited_at)
        VALUES($1::uuid,$2::uuid,NOW()) ON CONFLICT(show_id,user_id)
        DO UPDATE SET last_visited_at=EXCLUDED.last_visited_at`, [show.id, req.userId]);
      await pool.query(`INSERT INTO show_notice_receipts(notice_id,user_id,seen_at)
        SELECT notice.id,$4::uuid,NOW() FROM show_notices notice
        WHERE ${visibleNoticeSql} AND ($5::boolean=FALSE OR notice.visible_to_collaborators=TRUE)
        ON CONFLICT(notice_id,user_id) DO UPDATE
        SET seen_at=LEAST(show_notice_receipts.seen_at,EXCLUDED.seen_at)`,
      [req.entityId, show.id, show.tour_id, req.userId, Boolean(req.isExternalDaySheetCollaborator)]);
      res.json({ recorded: true });
    } catch (error) {
      console.error('Unable to record visit:', error);
      res.status(500).json({ error: { message: 'Unable to record visit' } });
    }
  });

  router.post('/shows/:id/notices', async (req, res) => {
    if (!canManage(req)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    const body = requestBody(req);
    const severity = SEVERITIES.has(body.severity) ? body.severity : null;
    const scope = SCOPES.has(body.scope) ? body.scope : null;
    const title = cleanText(body.title, 160);
    const message = cleanText(body.message, 3000);
    const expiresAt = validDate(body.expiresAt);
    if (!severity || !scope || !title || !message || (body.expiresAt && !expiresAt)) {
      return res.status(422).json({ error: { message: 'Complete the notice details' } });
    }
    try {
      const showResult = await findShow(pool, req);
      if (!showResult.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      const show = showResult.rows[0];
      if (scope === 'tour' && !show.tour_id) return res.status(422).json({ error: { message: 'This show is not assigned to a tour' } });
      const result = await pool.query(`INSERT INTO show_notices
          (entity_id,tour_id,show_id,title,message,severity,requires_acknowledgement,
           visible_to_collaborators,expires_at,created_by)
        SELECT show_record.entity_id,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9::timestamptz,$10::uuid
        FROM shows show_record WHERE show_record.id=$11::uuid AND show_record.entity_id::text=$1::text
        RETURNING id`, [req.entityId, scope === 'tour' ? show.tour_id : null,
        scope === 'show' ? show.id : null, title, message, severity,
        body.requiresAcknowledgement === true, body.visibleToCollaborators !== false,
        expiresAt, req.userId, show.id]);
      if (!result.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      res.status(201).json({ id: result.rows[0].id });
    } catch (error) {
      console.error('Unable to create notice:', error);
      res.status(500).json({ error: { message: 'Unable to create notice' } });
    }
  });

  router.post('/shows/:id/notices/:noticeId/acknowledge', async (req, res) => {
    if (!UUID.test(req.params.noticeId)) return res.status(400).json({ error: { message: 'Invalid notice ID' } });
    try {
      const showResult = await findShow(pool, req);
      if (!showResult.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      const show = showResult.rows[0];
      const notice = await pool.query(`SELECT notice.id FROM show_notices notice
        WHERE notice.id=$4::uuid AND ${visibleNoticeSql}
          AND ($5::boolean=FALSE OR notice.visible_to_collaborators=TRUE)`,
      [req.entityId, show.id, show.tour_id, req.params.noticeId, Boolean(req.isExternalDaySheetCollaborator)]);
      if (!notice.rowCount) return res.status(404).json({ error: { message: 'Notice not found' } });
      await pool.query(`INSERT INTO show_notice_receipts(notice_id,user_id,seen_at,acknowledged_at)
        VALUES($1::uuid,$2::uuid,NOW(),NOW()) ON CONFLICT(notice_id,user_id)
        DO UPDATE SET acknowledged_at=NOW()`, [req.params.noticeId, req.userId]);
      res.json({ acknowledged: true });
    } catch (error) {
      console.error('Unable to acknowledge notice:', error);
      res.status(500).json({ error: { message: 'Unable to acknowledge notice' } });
    }
  });

  router.delete('/shows/:id/notices/:noticeId', async (req, res) => {
    if (!UUID.test(req.params.noticeId)) return res.status(400).json({ error: { message: 'Invalid notice ID' } });
    if (!canManage(req)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    try {
      const result = await pool.query(`UPDATE show_notices notice SET archived_at=NOW(),updated_at=NOW()
        FROM shows show_record WHERE notice.id=$1::uuid AND notice.entity_id::text=$2::text
          AND show_record.id=$3::uuid AND show_record.entity_id::text=notice.entity_id::text
          AND (notice.show_id=show_record.id OR notice.tour_id=show_record.tour_id)
          AND notice.archived_at IS NULL RETURNING notice.id`,
      [req.params.noticeId, req.entityId, req.params.id]);
      if (!result.rowCount) return res.status(404).json({ error: { message: 'Notice not found' } });
      res.status(204).end();
    } catch (error) {
      console.error('Unable to archive notice:', error);
      res.status(500).json({ error: { message: 'Unable to archive notice' } });
    }
  });

  return router;
}

module.exports = { createShowUpdatesRouter, FINANCIAL_FIELDS, validDate };
