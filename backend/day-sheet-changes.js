const express = require('express');

const FIELD_COLUMNS = {
  tourId: 'tour_id', festivalName: 'festival_name', venueName: 'venue_name', venueAddress: 'venue_address', city: 'city', state: 'state', country: 'country',
  latitude: 'latitude', longitude: 'longitude', date: 'date', startTime: 'start_time', endTime: 'end_time', loadInTime: 'load_in_time',
  soundCheckTime: 'sound_check_time', doorTime: 'door_time', status: 'status', notes: 'notes', fee: 'fee', guaranteedFee: 'guaranteed_fee',
  backendDeal: 'backend_deal', isPaid: 'is_paid', capacity: 'capacity', ticketPrice: 'ticket_price', promoterName: 'promoter_name',
  promoterEmail: 'promoter_email', promoterPhone: 'promoter_phone', currency: 'currency', googleCalendarEventId: 'google_calendar_event_id',
};
const FINANCIAL_FIELDS = new Set(['fee', 'guaranteedFee', 'backendDeal', 'isPaid', 'ticketPrice', 'currency']);

function changeSummary(changes) {
  return Object.keys(changes || {}).map((field) => field.replace(/([A-Z])/g, ' $1').toLowerCase()).join(', ');
}

function valuesMatch(left, right) {
  if (left == null || right == null) return left == null && right == null;
  const normalizedLeft = left instanceof Date ? left.toISOString() : String(left);
  const normalizedRight = right instanceof Date ? right.toISOString() : String(right);
  return normalizedLeft === normalizedRight;
}

function createDaySheetChangeRouter(pool, serializeShow) {
  const router = express.Router();

  router.get('/shows/:showId/activity', async (req, res) => {
    const result = await pool.query(`SELECT c.id, c.changes, c.status, c.actor_external, c.created_at, c.reviewed_at,
        COALESCE(NULLIF(u.collaborator_profile_name, ''), u.name, u.email, 'SceneGen user') actor_name, COALESCE(r.name, r.email) reviewer_name
      FROM day_sheet_changes c JOIN users u ON u.id = c.actor_id LEFT JOIN users r ON r.id = c.reviewed_by
      WHERE c.show_id = $1 AND c.entity_id = $2 ORDER BY c.created_at DESC LIMIT 100`, [req.params.showId, req.entityId]);
    const hideFinances = req.isExternalDaySheetCollaborator && req.daySheetPermissions?.financialAccess === 'hidden';
    const changes = result.rows.map((row) => {
      if (!hideFinances) return row;
      return { ...row, changes: Object.fromEntries(Object.entries(row.changes || {}).filter(([field]) => !FINANCIAL_FIELDS.has(field))) };
    }).filter((row) => Object.keys(row.changes || {}).length);
    res.json({ changes, canReview: ['owner', 'admin'].includes(req.entityRole) });
  });

  router.post('/shows/:showId/change-requests/:changeId/:decision', async (req, res) => {
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    if (!['approve', 'reject'].includes(req.params.decision)) return res.status(404).json({ error: { message: 'Unknown decision' } });
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const found = await client.query(`SELECT * FROM day_sheet_changes WHERE id=$1 AND show_id=$2 AND entity_id=$3 AND status='pending' FOR UPDATE`, [req.params.changeId, req.params.showId, req.entityId]);
      if (!found.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Pending change request not found' } }); }
      const record = found.rows[0];
      const showLock = await client.query('SELECT * FROM shows WHERE id=$1 AND entity_id=$2 FOR UPDATE', [req.params.showId, req.entityId]);
      if (!showLock.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Show not found' } }); }
      if (req.params.decision === 'approve') {
        const fields = Object.entries(record.changes).filter(([field]) => FIELD_COLUMNS[field]);
        if (!fields.length) { await client.query('ROLLBACK'); return res.status(422).json({ error: { message: 'No valid changes to approve' } }); }
        if (fields.some(([field, change]) => !valuesMatch(showLock.rows[0][FIELD_COLUMNS[field]], change.old))) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: { message: 'This request is stale because the day sheet changed after it was submitted' } });
        }
        const values = fields.map(([, change]) => change.new);
        const setters = fields.map(([field], index) => `${FIELD_COLUMNS[field]}=$${index + 1}`);
        values.push(req.params.showId, req.entityId);
        await client.query(`UPDATE shows SET ${setters.join(', ')} WHERE id=$${values.length - 1} AND entity_id=$${values.length}`, values);
      }
      await client.query(`UPDATE day_sheet_changes SET status=$1, reviewed_by=$2, reviewed_at=NOW() WHERE id=$3`, [req.params.decision === 'approve' ? 'applied' : 'rejected', req.userId, record.id]);
      const show = await client.query('SELECT * FROM shows WHERE id=$1 AND entity_id=$2', [req.params.showId, req.entityId]);
      await client.query('COMMIT');
      res.json({ success: true, show: show.rowCount ? serializeShow(show.rows[0]) : null });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  });

  router.post('/shows/:showId/changes/:changeId/revert', async (req, res) => {
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const found = await client.query(`SELECT * FROM day_sheet_changes WHERE id=$1 AND show_id=$2 AND entity_id=$3 AND status='applied' FOR UPDATE`, [req.params.changeId, req.params.showId, req.entityId]);
      if (!found.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Applied change not found' } }); }
      const record = found.rows[0];
      const showLock = await client.query('SELECT * FROM shows WHERE id=$1 AND entity_id=$2 FOR UPDATE', [req.params.showId, req.entityId]);
      if (!showLock.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Show not found' } }); }
      const fields = Object.entries(record.changes).filter(([field]) => FIELD_COLUMNS[field]);
      if (!fields.length) { await client.query('ROLLBACK'); return res.status(422).json({ error: { message: 'No valid changes to restore' } }); }
      if (fields.some(([field, change]) => !valuesMatch(showLock.rows[0][FIELD_COLUMNS[field]], change.new))) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: { message: 'This change cannot be restored because the day sheet was edited afterward' } });
      }
      const values = fields.map(([, change]) => change.old);
      const setters = fields.map(([field], index) => `${FIELD_COLUMNS[field]}=$${index + 1}`);
      values.push(req.params.showId, req.entityId);
      await client.query(`UPDATE shows SET ${setters.join(', ')} WHERE id=$${values.length - 1} AND entity_id=$${values.length}`, values);
      await client.query(`UPDATE day_sheet_changes SET status='reverted', reviewed_by=$1, reviewed_at=NOW() WHERE id=$2`, [req.userId, record.id]);
      await client.query('COMMIT');
      res.json({ success: true, reverted: changeSummary(record.changes) });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  });

  return router;
}

module.exports = { createDaySheetChangeRouter, FIELD_COLUMNS, FINANCIAL_FIELDS, changeSummary };
