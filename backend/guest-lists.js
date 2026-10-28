/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PASS_TYPES = new Set(['guest', 'aftershow', 'all_access', 'photo', 'working']);
const clean = (value, max) => value == null || value === '' ? null : String(value).trim().slice(0, max);
const integer = (value, minimum, maximum) => Number.isInteger(Number(value)) && Number(value) >= minimum && Number(value) <= maximum ? Number(value) : null;
const privateMember = req => Boolean(req.entityId) && !req.isExternalDaySheetCollaborator;

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""').replace(/^[=+\-@]/, "'$&")}"`;
}

function serialize(row, includePrivate = true) {
  const record = {
    id: row.id,
    guestName: row.guest_name,
    requestedFor: row.requested_for,
    plusOnes: Number(row.plus_ones),
    partySize: Number(row.plus_ones) + 1,
    passType: row.pass_type,
    status: row.status,
    checkedInAt: row.checked_in_at,
  };
  if (includePrivate) {
    record.allocationId = row.allocation_id;
    record.createdAt = row.created_at;
    record.privateNote = row.private_note;
    record.decisionNote = row.decision_note;
  }
  return record;
}

async function showExists(client, showId, entityId) {
  const result = await client.query('SELECT id FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text', [showId, entityId]);
  return Boolean(result.rowCount);
}

async function approve(client, entityId, showId, requestId, userId, decisionNote, passType) {
  const request = await client.query(`SELECT request.*, allocation.allowance
    FROM guest_requests request
    LEFT JOIN guest_list_allocations allocation ON allocation.id=request.allocation_id
      AND allocation.show_id=request.show_id AND allocation.entity_id::text=request.entity_id::text
    WHERE request.id=$3::uuid AND request.show_id=$2::uuid AND request.entity_id::text=$1::text FOR UPDATE OF request`,
  [entityId, showId, requestId]);
  if (!request.rowCount) return { status: 404, message: 'Guest request not found' };
  if (request.rows[0].status === 'approved') return { request: request.rows[0] };
  await client.query(`INSERT INTO guest_list_settings(show_id,entity_id)
    SELECT id,entity_id FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text ON CONFLICT(show_id) DO NOTHING`, [showId,entityId]);
  const settings = await client.query(`SELECT settings.* FROM guest_list_settings settings
    WHERE settings.show_id=$2::uuid AND settings.entity_id::text=$1::text FOR UPDATE`, [entityId, showId]);
  const approved = await client.query(`SELECT COALESCE(sum(plus_ones + 1),0)::int total
    FROM guest_requests WHERE show_id=$2::uuid AND entity_id::text=$1::text AND status='approved'`, [entityId, showId]);
  const partySize = Number(request.rows[0].plus_ones) + 1;
  const guestLimit = settings.rows[0]?.guest_limit;
  if (guestLimit != null && approved.rows[0].total + partySize > Number(guestLimit)) {
    return { status: 409, message: `Approving this request would exceed the ${guestLimit}-person guest-list limit` };
  }
  if (request.rows[0].allocation_id) {
    await client.query('SELECT id FROM guest_list_allocations WHERE id=$1::uuid AND show_id=$2::uuid FOR UPDATE', [request.rows[0].allocation_id, showId]);
    const allocationUsed = await client.query(`SELECT COALESCE(sum(plus_ones + 1),0)::int total FROM guest_requests
      WHERE allocation_id=$1::uuid AND show_id=$2::uuid AND entity_id::text=$3::text AND status='approved'`,
    [request.rows[0].allocation_id, showId, entityId]);
    if (allocationUsed.rows[0].total + partySize > Number(request.rows[0].allowance)) {
      return { status: 409, message: `Approving this request would exceed ${request.rows[0].requested_for}'s allowance` };
    }
  }
  const updated = await client.query(`UPDATE guest_requests SET status='approved', pass_type=$5,
      decision_note=$6,decided_by=$4::uuid,decided_at=NOW(),updated_at=NOW()
    WHERE id=$3::uuid AND show_id=$2::uuid AND entity_id::text=$1::text RETURNING *`,
  [entityId, showId, requestId, userId, passType, decisionNote]);
  return { request: updated.rows[0] };
}

function createGuestListRouter(pool) {
  const router = express.Router();
  router.use('/shows/:id/guest-list', (req, res, next) => {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: { message: 'Invalid show ID' } });
    if (!privateMember(req)) return res.status(403).json({ error: { message: 'Guest lists are private to organisation members' } });
    next();
  });

  router.get('/shows/:id/guest-list', async (req, res) => {
    if (!await showExists(pool, req.params.id, req.entityId)) return res.status(404).json({ error: { message: 'Show not found' } });
    const view = req.query.view === 'door' || req.query.view === 'promoter' ? req.query.view : 'manage';
    const [settings, allocations, requests] = await Promise.all([
      pool.query('SELECT guest_limit,requests_open FROM guest_list_settings WHERE show_id=$1::uuid AND entity_id::text=$2::text', [req.params.id,req.entityId]),
      pool.query(`SELECT allocation.id,allocation.person_name,allocation.allowance,
          COALESCE(sum(request.plus_ones + 1) FILTER (WHERE request.status='approved'),0)::int used
        FROM guest_list_allocations allocation LEFT JOIN guest_requests request ON request.allocation_id=allocation.id
          AND request.show_id=allocation.show_id AND request.entity_id::text=allocation.entity_id::text
        WHERE allocation.show_id=$1::uuid AND allocation.entity_id::text=$2::text
        GROUP BY allocation.id ORDER BY lower(allocation.person_name)`, [req.params.id,req.entityId]),
      pool.query(`SELECT * FROM guest_requests WHERE show_id=$1::uuid AND entity_id::text=$2::text
        ${view === 'manage' ? '' : "AND status='approved'"}
        ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,lower(guest_name)`, [req.params.id,req.entityId]),
    ]);
    const guestLimit = settings.rows[0]?.guest_limit == null ? null : Number(settings.rows[0].guest_limit);
    const approvedHeadcount = requests.rows.filter(row => row.status === 'approved').reduce((sum,row) => sum + Number(row.plus_ones) + 1,0);
    res.set('Cache-Control', 'private, no-store');
    res.json({ view, settings: { guestLimit, requestsOpen: settings.rows[0]?.requests_open !== false },
      summary: { approvedHeadcount, remaining: guestLimit == null ? null : Math.max(0,guestLimit-approvedHeadcount) },
      allocations: view === 'manage' ? allocations.rows.map(row => ({ id: row.id, personName: row.person_name, allowance: Number(row.allowance), used: Number(row.used) })) : [],
      requests: requests.rows.map(row => serialize(row, view === 'manage')), passTypes: [...PASS_TYPES] });
  });

  router.put('/shows/:id/guest-list/settings', async (req, res) => {
    const guestLimit = req.body.guestLimit === null || req.body.guestLimit === '' ? null : integer(req.body.guestLimit,0,5000);
    if (req.body.guestLimit !== null && req.body.guestLimit !== '' && guestLimit === null) return res.status(422).json({ error: { message: 'Guest limit must be between 0 and 5,000' } });
    const requestsOpen = req.body.requestsOpen !== false;
    const result = await pool.query(`INSERT INTO guest_list_settings(show_id,entity_id,guest_limit,requests_open,updated_by)
      SELECT id,entity_id,$3,$4,$5::uuid FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text
      ON CONFLICT(show_id) DO UPDATE SET guest_limit=EXCLUDED.guest_limit,requests_open=EXCLUDED.requests_open,
        updated_by=EXCLUDED.updated_by,updated_at=NOW() RETURNING guest_limit,requests_open`,
    [req.params.id,req.entityId,guestLimit,requestsOpen,req.userId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
    res.json({ settings: { guestLimit: result.rows[0].guest_limit, requestsOpen: result.rows[0].requests_open } });
  });

  router.post('/shows/:id/guest-list/allocations', async (req, res) => {
    const personName = clean(req.body.personName,120);
    const allowance = integer(req.body.allowance,0,500);
    if (!personName || allowance === null) return res.status(422).json({ error: { message: 'Person and an allowance from 0 to 500 are required' } });
    try {
      const result = await pool.query(`INSERT INTO guest_list_allocations(entity_id,show_id,person_name,allowance,created_by)
        SELECT entity_id,id,$3,$4,$5::uuid FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text RETURNING *`,
      [req.params.id,req.entityId,personName,allowance,req.userId]);
      if (!result.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      res.status(201).json({ allocation: { id: result.rows[0].id,personName:result.rows[0].person_name,allowance:Number(result.rows[0].allowance),used:0 } });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: { message: 'That person already has an allowance' } });
      throw error;
    }
  });

  router.delete('/shows/:id/guest-list/allocations/:allocationId', async (req, res) => {
    if (!UUID.test(req.params.allocationId)) return res.status(400).json({ error: { message: 'Invalid allowance' } });
    const result = await pool.query(`DELETE FROM guest_list_allocations allocation USING shows show_record
      WHERE allocation.id=$3::uuid AND allocation.show_id=$1::uuid AND show_record.id=allocation.show_id
        AND allocation.entity_id::text=$2::text AND show_record.entity_id::text=$2::text RETURNING allocation.id`,
    [req.params.id,req.entityId,req.params.allocationId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Allowance not found' } });
    res.json({ deleted: true });
  });

  router.post('/shows/:id/guest-list/requests', async (req, res) => {
    const guestName = clean(req.body.guestName,160);
    const requestedFor = clean(req.body.requestedFor,120);
    const plusOnes = integer(req.body.plusOnes ?? 0,0,10);
    const passType = PASS_TYPES.has(req.body.passType) ? req.body.passType : 'guest';
    const allocationId = req.body.allocationId ? String(req.body.allocationId) : null;
    if (!guestName || !requestedFor || plusOnes === null || (allocationId && !UUID.test(allocationId))) return res.status(422).json({ error: { message: 'Guest, requester and a valid plus-one count are required' } });
    const result = await pool.query(`INSERT INTO guest_requests(entity_id,show_id,allocation_id,guest_name,requested_for,plus_ones,pass_type,private_note,created_by)
      SELECT show_record.entity_id,show_record.id,allocation.id,$4,$5,$6,$7,$8,$9::uuid
      FROM shows show_record LEFT JOIN guest_list_allocations allocation ON allocation.id=$3::uuid
        AND allocation.show_id=show_record.id AND allocation.entity_id::text=show_record.entity_id::text
      LEFT JOIN guest_list_settings settings ON settings.show_id=show_record.id AND settings.entity_id::text=show_record.entity_id::text
      WHERE show_record.id=$1::uuid AND show_record.entity_id::text=$2::text
        AND COALESCE(settings.requests_open,TRUE)=TRUE AND ($3::uuid IS NULL OR allocation.id IS NOT NULL) RETURNING guest_requests.*`,
    [req.params.id,req.entityId,allocationId,guestName,requestedFor,plusOnes,passType,clean(req.body.privateNote,1000),req.userId]);
    if (!result.rowCount) return res.status(409).json({ error: { message: 'Requests are closed or the selected allowance is unavailable' } });
    res.status(201).json({ request: serialize(result.rows[0]) });
  });

  router.patch('/shows/:id/guest-list/requests/:requestId', async (req, res) => {
    if (!UUID.test(req.params.requestId)) return res.status(400).json({ error: { message: 'Invalid guest request' } });
    const action = String(req.body.action || '');
    const decisionNote = clean(req.body.decisionNote,500);
    const passType = PASS_TYPES.has(req.body.passType) ? req.body.passType : 'guest';
    if (action === 'approve') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const outcome = await approve(client,req.entityId,req.params.id,req.params.requestId,req.userId,decisionNote,passType);
        if (outcome.status) { await client.query('ROLLBACK'); return res.status(outcome.status).json({ error: { message: outcome.message } }); }
        await client.query('COMMIT'); return res.json({ request: serialize(outcome.request) });
      } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; } finally { client.release(); }
    }
    if (action === 'reject') {
      const result = await pool.query(`UPDATE guest_requests SET status='rejected',decision_note=$4,decided_by=$5::uuid,
          decided_at=NOW(),checked_in_at=NULL,checked_in_by=NULL,updated_at=NOW()
        WHERE id=$3::uuid AND show_id=$1::uuid AND entity_id::text=$2::text RETURNING *`,
      [req.params.id,req.entityId,req.params.requestId,decisionNote,req.userId]);
      if (!result.rowCount) return res.status(404).json({ error: { message: 'Guest request not found' } });
      return res.json({ request: serialize(result.rows[0]) });
    }
    if (action === 'check_in' || action === 'undo_check_in') {
      const result = await pool.query(`UPDATE guest_requests SET checked_in_at=${action === 'check_in' ? 'NOW()' : 'NULL'},
          checked_in_by=${action === 'check_in' ? '$4::uuid' : 'NULL'},updated_at=NOW()
        WHERE id=$3::uuid AND show_id=$1::uuid AND entity_id::text=$2::text AND status='approved' RETURNING *`,
      [req.params.id,req.entityId,req.params.requestId,req.userId]);
      if (!result.rowCount) return res.status(404).json({ error: { message: 'Approved guest not found' } });
      return res.json({ request: serialize(result.rows[0]) });
    }
    res.status(422).json({ error: { message: 'Choose approve, reject, check in or undo check in' } });
  });

  router.delete('/shows/:id/guest-list/requests/:requestId', async (req, res) => {
    if (!UUID.test(req.params.requestId)) return res.status(400).json({ error: { message: 'Invalid guest request' } });
    const result = await pool.query(`DELETE FROM guest_requests request USING shows show_record
      WHERE request.id=$3::uuid AND request.show_id=$1::uuid AND show_record.id=request.show_id
        AND request.entity_id::text=$2::text AND show_record.entity_id::text=$2::text RETURNING request.id`,
    [req.params.id,req.entityId,req.params.requestId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Guest request not found' } });
    res.json({ deleted: true });
  });

  router.get('/shows/:id/guest-list/export.csv', async (req, res) => {
    const show = await pool.query('SELECT date,venue_name,city FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text', [req.params.id,req.entityId]);
    if (!show.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
    const requests = await pool.query(`SELECT guest_name,plus_ones,pass_type,requested_for,checked_in_at FROM guest_requests
      WHERE show_id=$1::uuid AND entity_id::text=$2::text AND status='approved' ORDER BY lower(guest_name)`, [req.params.id,req.entityId]);
    const lines = [['Guest','Plus ones','Party size','Pass','Requested for','Checked in'].map(csvCell).join(',')];
    for (const row of requests.rows) lines.push([row.guest_name,row.plus_ones,Number(row.plus_ones)+1,row.pass_type,row.requested_for,row.checked_in_at ? 'Yes' : 'No'].map(csvCell).join(','));
    const date = String(show.rows[0].date || '').slice(0,10);
    res.set('Content-Type','text/csv; charset=utf-8');
    res.set('Content-Disposition',`attachment; filename="guest-list-${date || req.params.id}.csv"`);
    res.set('Cache-Control','private, no-store');
    res.send(`\uFEFF${lines.join('\r\n')}\r\n`);
  });

  return router;
}

module.exports = { createGuestListRouter, PASS_TYPES, csvCell, serialize, approve };
