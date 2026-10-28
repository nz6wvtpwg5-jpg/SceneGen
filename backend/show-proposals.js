const express = require('express');
const { clean, verifiedPlace, proposalGrant } = require('./show-proposal-policy');
const { upsertVenue } = require('./venue-directory');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^\S+@\S+\.\S+$/;

function validDate(value) {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

async function memberRole(client, entityId, userId) {
  const result = await client.query(`SELECT CASE WHEN e.administrator_id=$2::text THEN 'owner' ELSE em.role END role
    FROM entities e LEFT JOIN entity_memberships em ON em.entity_id=e.id AND em.user_id=$2::uuid AND em.status='active'
    WHERE e.id::text=$1 AND (e.administrator_id=$2::text OR em.user_id IS NOT NULL) LIMIT 1`, [entityId, userId]);
  return result.rows[0]?.role || null;
}

function proposalSnapshot(row) {
  return {
    showDate: row.show_date, venuePlaceId: row.venue_place_id, venueName: row.venue_name,
    venueAddress: row.venue_address, city: row.city, region: row.region, country: row.country,
    countryCode: row.country_code, latitude: Number(row.latitude), longitude: Number(row.longitude),
    currency: row.currency, offerAmount: Number(row.offer_amount), dealType: row.deal_type,
    offerTerms: row.offer_terms, notes: row.notes, promoterName: row.promoter_name,
    promoterEmail: row.promoter_email, promoterPhone: row.promoter_phone, revision: row.revision,
  };
}

async function attachProposalEvents(client, rows, { includeActorEmail = true } = {}) {
  if (!rows.length) return rows;
  const ids = rows.map((row) => row.id);
  const result = await client.query(`SELECT event.*, actor.name actor_name, actor.email actor_email
    FROM show_proposal_events event LEFT JOIN users actor ON actor.id=event.actor_id
    WHERE event.proposal_id=ANY($1::uuid[]) ORDER BY event.created_at, event.id`, [ids]);
  const byProposal = new Map();
  for (const eventRow of result.rows) {
    const event = includeActorEmail ? eventRow : { ...eventRow, actor_email: undefined };
    const events = byProposal.get(String(event.proposal_id)) || [];
    events.push(event);
    byProposal.set(String(event.proposal_id), events);
  }
  return rows.map((row) => ({ ...row, events: byProposal.get(String(row.id)) || [] }));
}

function createShowProposalRouter(pool, createEntityNotification) {
  const router = express.Router();

  router.post('/show-proposals', async (req, res) => {
    const entityId = clean(req.body.entityId, 255);
    const showDate = clean(req.body.showDate, 10);
    const currency = clean(req.body.currency, 3).toUpperCase();
    const offerAmount = Number(req.body.offerAmount);
    const dealType = clean(req.body.dealType, 40);
    const offerTerms = clean(req.body.offerTerms, 10000);
    const notes = clean(req.body.notes, 10000) || null;
    if (!UUID.test(entityId) || !validDate(showDate) || !/^[A-Z]{3}$/.test(currency)
      || !Number.isFinite(offerAmount) || offerAmount < 0 || !dealType || !offerTerms) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Date, venue, currency, offer, deal type and terms are required' } });
    }
    if (showDate < new Date().toISOString().slice(0, 10)) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'A proposed show must be today or later' } });
    const promoterEmail = clean(req.body.promoterEmail, 255).toLowerCase() || null;
    if (promoterEmail && !EMAIL.test(promoterEmail)) return res.status(422).json({ error: { message: 'Enter a valid promoter email address' } });
    try {
      const place = await verifiedPlace(clean(req.body.venuePlaceId, 300));
      if (!place.name) return res.status(422).json({ error: { message: 'Choose a named venue from Google Places' } });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${entityId}:${showDate}:${place.placeId}`]);
        const grant = await proposalGrant(client, entityId, req.userId, place.country);
        if (!grant) { await client.query('ROLLBACK'); return res.status(403).json({ error: { code: 'OUTSIDE_ASSIGNED_TERRITORY', message: `You cannot propose shows in ${place.country}` } }); }
        const duplicate = await client.query(`SELECT id FROM show_proposals WHERE entity_id::text=$1 AND show_date=$2 AND venue_place_id=$3 AND status IN ('pending','changes_requested','accepted') LIMIT 1`, [entityId, showDate, place.placeId]);
        const existingShow = await client.query(`SELECT id FROM shows WHERE entity_id::text=$1 AND date=$2 AND (venue_address=$3 OR (lower(venue_name)=lower($4) AND lower(city)=lower($5))) LIMIT 1`, [entityId, showDate, place.address, place.name, place.city]);
        if (duplicate.rowCount || existingShow.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: { code: 'DUPLICATE_SHOW_PROPOSAL', message: 'A show or active proposal already exists for this venue and date' } }); }
        const promoterName = clean(req.body.promoterName, 255) || null;
        const promoterPhone = clean(req.body.promoterPhone, 50) || null;
        const pendingNotes = [`Pending collaborator proposal - not yet accepted.`, `Offer terms: ${offerTerms}`, notes].filter(Boolean).join('\n\n');
        const venue = await upsertVenue(client,{ googleVerified:true,venuePlaceId:place.placeId,venueName:place.name,venueAddress:place.address,
          city:place.city,state:place.region,country:place.country,countryCode:place.countryCode,latitude:place.latitude,longitude:place.longitude,source:'agent_proposal' });
        const provisional = await client.query(`INSERT INTO shows
          (entity_id,venue_name,venue_address,city,state,country,venue_lat,venue_lng,latitude,longitude,date,start_time,status,notes,fee,guaranteed_fee,backend_deal,promoter_name,promoter_email,promoter_phone,currency,venue_id,venue_place_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$7,$8,$9,'20:00','pending_acceptance',$10,$11,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
        [entityId,place.name,place.address,place.city,place.region || null,place.country,place.latitude,place.longitude,showDate,pendingNotes,offerAmount,dealType,promoterName,promoterEmail,promoterPhone,currency,venue?.id || null,place.placeId]);
        const inserted = await client.query(`INSERT INTO show_proposals
          (entity_id,proposed_by,source_grant_id,show_date,venue_place_id,venue_name,venue_address,city,region,country,country_code,latitude,longitude,currency,offer_amount,deal_type,offer_terms,notes,promoter_name,promoter_email,promoter_phone,proposed_show_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::uuid) RETURNING *`,
        [entityId,req.userId,grant.id,showDate,place.placeId,place.name,place.address,place.city,place.region || null,place.country,place.countryCode,place.latitude,place.longitude,currency,offerAmount,dealType,offerTerms,notes,promoterName,promoterEmail,promoterPhone,provisional.rows[0].id]);
        await client.query(`INSERT INTO show_proposal_events(proposal_id,actor_id,event_type,snapshot) VALUES($1,$2,'submitted',$3::jsonb)`, [inserted.rows[0].id, req.userId, JSON.stringify(proposalSnapshot(inserted.rows[0]))]);
        await client.query('COMMIT');
        await createEntityNotification(entityId, 'show_proposal', 'New show proposal', `${place.name}, ${place.city} on ${showDate} - ${currency} ${offerAmount.toFixed(2)}`, '/show-proposals').catch((error) => console.error('Show proposal notification failed:', error.message));
        res.status(201).json({ proposal: inserted.rows[0] });
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        if (error.code === '23505' && error.constraint === 'idx_show_proposals_active_venue_date') return res.status(409).json({ error: { code: 'DUPLICATE_SHOW_PROPOSAL', message: 'An active proposal already exists for this venue and date' } });
        throw error;
      } finally { client.release(); }
    } catch (error) {
      console.error('Show proposal failed:', error.message);
      res.status(error.status || 500).json({ error: { code: error.status === 422 ? 'VENUE_NOT_VERIFIED' : 'SHOW_PROPOSAL_FAILED', message: error.message || 'Unable to submit this proposal' } });
    }
  });

  router.get('/show-proposals', async (req, res) => {
    const entityId = clean(req.query.entityId, 255);
    if (!UUID.test(entityId)) return res.status(400).json({ error: { message: 'A valid workspace is required' } });
    const role = await memberRole(pool, entityId, req.userId);
    if (!role) return res.status(403).json({ error: { message: 'Workspace access is required' } });
    const result = await pool.query(`SELECT p.*, u.name proposed_by_name, u.email proposed_by_email FROM show_proposals p JOIN users u ON u.id=p.proposed_by WHERE p.entity_id::text=$1 ORDER BY CASE p.status WHEN 'pending' THEN 0 WHEN 'changes_requested' THEN 1 ELSE 2 END, p.show_date`, [entityId]);
    res.json({ proposals: await attachProposalEvents(pool, result.rows) });
  });

  router.get('/my-show-proposals', async (req, res) => {
    const [result, workspaces] = await Promise.all([
      pool.query(`SELECT p.*, e.name workspace_name FROM show_proposals p JOIN entities e ON e.id=p.entity_id WHERE p.proposed_by=$1::uuid ORDER BY p.created_at DESC`, [req.userId]),
      pool.query(`SELECT DISTINCT e.id, e.name, g.scope_type, g.countries
        FROM day_sheet_access_grants g JOIN entities e ON e.id::text=g.entity_id::text
        WHERE g.user_id=$1::uuid AND g.can_propose_shows=TRUE AND g.revoked_at IS NULL
          AND (g.expires_at IS NULL OR g.expires_at>NOW()) AND g.scope_type IN ('all','countries')
        ORDER BY e.name`, [req.userId]),
    ]);
    res.json({ proposals: await attachProposalEvents(pool, result.rows, { includeActorEmail: false }), workspaces: workspaces.rows });
  });

  router.post('/show-proposals/:id/revise', async (req, res) => {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: { message: 'Invalid proposal' } });
    const showDate = clean(req.body.showDate, 10);
    const currency = clean(req.body.currency, 3).toUpperCase();
    const offerAmount = Number(req.body.offerAmount);
    const dealType = clean(req.body.dealType, 40);
    const offerTerms = clean(req.body.offerTerms, 10000);
    const notes = clean(req.body.notes, 10000) || null;
    if (!validDate(showDate) || !/^[A-Z]{3}$/.test(currency) || !Number.isFinite(offerAmount) || offerAmount < 0 || !dealType || !offerTerms) return res.status(422).json({ error: { message: 'Date, venue, currency, offer, deal type and terms are required' } });
    if (showDate < new Date().toISOString().slice(0, 10)) return res.status(422).json({ error: { message: 'A proposed show must be today or later' } });
    const promoterEmail = clean(req.body.promoterEmail, 255).toLowerCase() || null;
    if (promoterEmail && !EMAIL.test(promoterEmail)) return res.status(422).json({ error: { message: 'Enter a valid promoter email address' } });
    try {
      const place = await verifiedPlace(clean(req.body.venuePlaceId, 300));
      if (!place.name) return res.status(422).json({ error: { message: 'Choose a named venue from Google Places' } });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const locked = await client.query('SELECT * FROM show_proposals WHERE id=$1::uuid FOR UPDATE', [req.params.id]);
        const proposal = locked.rows[0];
        if (!proposal) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Proposal not found' } }); }
        if (String(proposal.proposed_by) !== String(req.userId)) { await client.query('ROLLBACK'); return res.status(403).json({ error: { message: 'Only the original collaborator can revise this proposal' } }); }
        if (proposal.status !== 'changes_requested') { await client.query('ROLLBACK'); return res.status(409).json({ error: { message: 'This proposal is not awaiting changes' } }); }
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${proposal.entity_id}:${showDate}:${place.placeId}`]);
        const grant = await proposalGrant(client, proposal.entity_id, req.userId, place.country);
        if (!grant) { await client.query('ROLLBACK'); return res.status(403).json({ error: { code: 'OUTSIDE_ASSIGNED_TERRITORY', message: `You cannot propose shows in ${place.country}` } }); }
        const duplicate = await client.query(`SELECT id FROM show_proposals WHERE entity_id=$1 AND id<>$2 AND show_date=$3 AND venue_place_id=$4 AND status IN ('pending','changes_requested','accepted') LIMIT 1`, [proposal.entity_id, proposal.id, showDate, place.placeId]);
        const existingShow = await client.query(`SELECT id FROM shows WHERE entity_id=$1 AND date=$2
          AND (venue_address=$3 OR (lower(venue_name)=lower($4) AND lower(city)=lower($5)))
          AND ($6::uuid IS NULL OR id<>$6::uuid) LIMIT 1`, [proposal.entity_id,showDate,place.address,place.name,place.city,proposal.proposed_show_id]);
        if (duplicate.rowCount || existingShow.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: { message: 'A show or active proposal already exists for this venue and date' } }); }
        const promoterName = clean(req.body.promoterName,255) || null;
        const promoterPhone = clean(req.body.promoterPhone,50) || null;
        const pendingNotes = [`Pending collaborator proposal - not yet accepted.`,`Offer terms: ${offerTerms}`,notes].filter(Boolean).join('\n\n');
        const venue = await upsertVenue(client,{ googleVerified:true,venuePlaceId:place.placeId,venueName:place.name,venueAddress:place.address,
          city:place.city,state:place.region,country:place.country,countryCode:place.countryCode,latitude:place.latitude,longitude:place.longitude,source:'agent_proposal' });
        let proposedShowId = proposal.proposed_show_id;
        const provisional = proposedShowId ? await client.query(`UPDATE shows SET venue_name=$3,venue_address=$4,city=$5,state=$6,country=$7,
            venue_lat=$8,venue_lng=$9,latitude=$8,longitude=$9,date=$10,status='pending_acceptance',notes=$11,fee=$12,
            guaranteed_fee=$12,backend_deal=$13,promoter_name=$14,promoter_email=$15,promoter_phone=$16,currency=$17,
            venue_id=$18,venue_place_id=$19,updated_at=NOW()
          WHERE id=$1::uuid AND entity_id::text=$2::text AND status='pending_acceptance' RETURNING id`,
        [proposedShowId,proposal.entity_id,place.name,place.address,place.city,place.region || null,place.country,place.latitude,place.longitude,
          showDate,pendingNotes,offerAmount,dealType,promoterName,promoterEmail,promoterPhone,currency,venue?.id || null,place.placeId]) : { rows: [] };
        if (!provisional.rows.length) {
          const created = await client.query(`INSERT INTO shows
            (entity_id,venue_name,venue_address,city,state,country,venue_lat,venue_lng,latitude,longitude,date,start_time,status,notes,fee,guaranteed_fee,backend_deal,promoter_name,promoter_email,promoter_phone,currency,venue_id,venue_place_id)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$7,$8,$9,'20:00','pending_acceptance',$10,$11,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
          [proposal.entity_id,place.name,place.address,place.city,place.region || null,place.country,place.latitude,place.longitude,showDate,pendingNotes,
            offerAmount,dealType,promoterName,promoterEmail,promoterPhone,currency,venue?.id || null,place.placeId]);
          proposedShowId = created.rows[0].id;
        }
        const updated = await client.query(`UPDATE show_proposals SET source_grant_id=$1, status='pending', show_date=$2,
          venue_place_id=$3, venue_name=$4, venue_address=$5, city=$6, region=$7, country=$8, country_code=$9,
          latitude=$10, longitude=$11, currency=$12, offer_amount=$13, deal_type=$14, offer_terms=$15, notes=$16,
          promoter_name=$17, promoter_email=$18, promoter_phone=$19, proposed_show_id=$20::uuid,revision=revision+1,submitted_at=NOW(),
          decided_at=NULL, decided_by=NULL, decision_note=NULL, updated_at=NOW() WHERE id=$21 RETURNING *`,
        [grant.id, showDate, place.placeId, place.name, place.address, place.city, place.region || null, place.country, place.countryCode,
          place.latitude,place.longitude,currency,offerAmount,dealType,offerTerms,notes,promoterName,promoterEmail,promoterPhone,proposedShowId,proposal.id]);
        await client.query(`INSERT INTO show_proposal_events(proposal_id,actor_id,event_type,note,snapshot) VALUES($1,$2,'submitted',$3,$4::jsonb)`, [proposal.id, req.userId, 'Revised offer submitted', JSON.stringify(proposalSnapshot(updated.rows[0]))]);
        const responseProposal = (await attachProposalEvents(client, updated.rows, { includeActorEmail: false }))[0];
        await client.query('COMMIT');
        await createEntityNotification(proposal.entity_id, 'show_proposal', 'Show offer revised', `${place.name}, ${place.city} has been resubmitted for approval`, '/show-proposals').catch((error) => console.error('Proposal revision notification failed:', error.message));
        res.json({ proposal: responseProposal });
      } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
      finally { client.release(); }
    } catch (error) {
      console.error('Show proposal revision failed:', error.message);
      res.status(error.status || 500).json({ error: { message: error.message || 'Unable to revise this proposal' } });
    }
  });

  router.post('/show-proposals/:id/decision', async (req, res) => {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: { message: 'Invalid proposal' } });
    const decision = clean(req.body.decision, 32);
    const decisionNote = clean(req.body.note, 10000) || null;
    if (!['accepted', 'declined', 'changes_requested'].includes(decision)) return res.status(422).json({ error: { message: 'Choose accept, decline or request changes' } });
    if (decision !== 'accepted' && !decisionNote) return res.status(422).json({ error: { message: 'Add a reason or requested changes' } });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query('SELECT * FROM show_proposals WHERE id=$1::uuid FOR UPDATE', [req.params.id]);
      const proposal = locked.rows[0];
      if (!proposal) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Proposal not found' } }); }
      const role = await memberRole(client, proposal.entity_id, req.userId);
      if (!['owner', 'admin'].includes(role)) { await client.query('ROLLBACK'); return res.status(403).json({ error: { message: 'Owner or administrator approval is required' } }); }
      if (proposal.status !== 'pending') { await client.query('ROLLBACK'); return res.status(409).json({ error: { message: proposal.status === 'changes_requested' ? 'This proposal is awaiting collaborator revision' : 'This proposal has already been decided' } }); }
      let showId = null;
      if (decision === 'accepted') {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${proposal.entity_id}:${proposal.show_date}:${proposal.venue_place_id}`]);
        const duplicate = await client.query(`SELECT id FROM shows WHERE entity_id::text=$1 AND date=$2
          AND (venue_address=$3 OR (lower(venue_name)=lower($4) AND lower(city)=lower($5)))
          AND ($6::uuid IS NULL OR id<>$6::uuid) LIMIT 1`, [proposal.entity_id,proposal.show_date,proposal.venue_address,proposal.venue_name,proposal.city,proposal.proposed_show_id]);
        if (duplicate.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: { code: 'DUPLICATE_SHOW', message: 'A show already exists for this venue and date' } }); }
        const acceptedNotes = [`Offer terms: ${proposal.offer_terms}`, proposal.notes].filter(Boolean).join('\n\n');
        const venue=await upsertVenue(client,{googleVerified:true,venuePlaceId:proposal.venue_place_id,venueName:proposal.venue_name,venueAddress:proposal.venue_address,city:proposal.city,state:proposal.region,country:proposal.country,countryCode:proposal.country_code,latitude:proposal.latitude,longitude:proposal.longitude,source:'agent_proposal'});
        const promoted = proposal.proposed_show_id ? await client.query(`UPDATE shows SET venue_name=$3,venue_address=$4,city=$5,state=$6,country=$7,
            venue_lat=$8,venue_lng=$9,latitude=$8,longitude=$9,date=$10,status='tentative',notes=$11,fee=$12,guaranteed_fee=$12,
            backend_deal=$13,promoter_name=$14,promoter_email=$15,promoter_phone=$16,currency=$17,venue_id=$18,venue_place_id=$19,updated_at=NOW()
          WHERE id=$1::uuid AND entity_id::text=$2::text AND status='pending_acceptance' RETURNING id`,
        [proposal.proposed_show_id,proposal.entity_id,proposal.venue_name,proposal.venue_address,proposal.city,proposal.region,proposal.country,
          proposal.latitude,proposal.longitude,proposal.show_date,acceptedNotes,proposal.offer_amount,proposal.deal_type,proposal.promoter_name,
          proposal.promoter_email,proposal.promoter_phone,proposal.currency,venue?.id || null,proposal.venue_place_id]) : { rows: [] };
        if (promoted.rows.length) showId = promoted.rows[0].id;
        else {
          const show = await client.query(`INSERT INTO shows
            (entity_id,venue_name,venue_address,city,state,country,venue_lat,venue_lng,latitude,longitude,date,start_time,status,notes,fee,guaranteed_fee,backend_deal,promoter_name,promoter_email,promoter_phone,currency,venue_id,venue_place_id)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$7,$8,$9,'20:00','tentative',$10,$11,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
          [proposal.entity_id,proposal.venue_name,proposal.venue_address,proposal.city,proposal.region,proposal.country,proposal.latitude,proposal.longitude,
            proposal.show_date,acceptedNotes,proposal.offer_amount,proposal.deal_type,proposal.promoter_name,proposal.promoter_email,proposal.promoter_phone,
            proposal.currency,venue?.id || null,proposal.venue_place_id]);
          showId = show.rows[0].id;
        }
      } else if (decision === 'declined' && proposal.proposed_show_id) {
        await client.query(`DELETE FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text AND status='pending_acceptance'`, [proposal.proposed_show_id,proposal.entity_id]);
      }
      const updated = await client.query(`UPDATE show_proposals SET status=$1,decision_note=$2,decided_by=$3,decided_at=NOW(),
        accepted_show_id=$4,proposed_show_id=COALESCE(proposed_show_id,$4),updated_at=NOW() WHERE id=$5 RETURNING *`,
      [decision,decisionNote,req.userId,showId,proposal.id]);
      await client.query(`INSERT INTO show_proposal_events(proposal_id,actor_id,event_type,note,snapshot) VALUES($1,$2,$3,$4,$5::jsonb)`, [proposal.id, req.userId, decision, decisionNote, JSON.stringify(proposalSnapshot(proposal))]);
      await client.query(`INSERT INTO notifications(user_id,entity_id,type,title,message,action_url)
        VALUES($1,$2,'show_proposal_decision',$3,$4,'/external-day-sheets')`, [proposal.proposed_by, proposal.entity_id,
        decision === 'accepted' ? 'Show offer accepted' : decision === 'declined' ? 'Show offer declined' : 'Changes requested on show offer',
        `${proposal.venue_name}, ${proposal.city} on ${proposal.show_date}`]);
      const responseProposal = (await attachProposalEvents(client, updated.rows))[0];
      await client.query('COMMIT');
      res.json({ proposal: responseProposal, showId });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Show proposal decision failed:', error.message);
      res.status(500).json({ error: { message: 'Unable to decide this proposal' } });
    } finally { client.release(); }
  });

  return router;
}

module.exports = { attachProposalEvents, createShowProposalRouter, memberRole, proposalSnapshot, validDate };
