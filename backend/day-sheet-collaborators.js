const express = require('express');
const crypto = require('crypto');
const { publicFrontendUrl } = require('./public-frontend-url');
const { sendDaySheetInvitation, sendTransactionalEmail } = require('./email');
const { matches: territoryMatches, overlaps, resolveShowCountry, territoryLabel, validTerritory } = require('./territories');
const { mergePortalGrant } = require('./day-sheet-access-policy');

const clean = (value) => String(value || '').trim();
const email = (value) => clean(value).toLowerCase();
const singleEmail = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenHash = (value) => crypto.createHash('sha256').update(value).digest('hex');

function encryptInviteToken(value) {
  const secret = process.env.BACKEND_SERVICE_TOKEN;
  if (!secret) throw new Error('Invitation link encryption is not configured');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(secret).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptInviteToken(value) {
  try {
    const secret = process.env.BACKEND_SERVICE_TOKEN;
    const [iv, tag, encrypted] = String(value || '').split('.');
    if (!secret || !iv || !tag || !encrypted) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(secret).digest(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

const territoryExclusivityApplies = (scopeType) => scopeType === 'countries';

function scopeLabel(row) {
  if (row.scope_type === 'all') return 'All day sheets';
  if (row.scope_type === 'countries') return (row.countries || []).map(territoryLabel).join(', ');
  if (row.scope_type === 'tour') return row.tour_name || 'One tour';
  return row.show_label || 'One day sheet';
}

function createDaySheetCollaboratorRouter(pool, serializeShow) {
  const router = express.Router();

  router.get('/my-agent-upgrade-requests', async (req, res) => {
    const result = await pool.query(`SELECT relationship.id, relationship.entity_id, entity.name entity_name,
        relationship.status, relationship.commission_percentage, relationship.profile_snapshot, relationship.requested_at,
        relationship.decided_at, relationship.decision_note
      FROM artist_agent_relationships relationship
      JOIN entities entity ON entity.id=relationship.entity_id
      WHERE relationship.agent_user_id=$1::uuid
        AND relationship.status IN ('requested','changes_requested','approved','active','paused')
      ORDER BY relationship.updated_at DESC`, [req.userId]);
    res.json({ requests: result.rows });
  });

  router.post('/my-agent-upgrade-requests/:id/activate', async (req, res) => {
    if (!UUID.test(req.params.id)) return res.status(422).json({ error: { message: 'Invalid booking-agent request' } });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const activated = await client.query(`UPDATE artist_agent_relationships relationship SET
          status='active',activated_at=COALESCE(activated_at,NOW()),updated_at=NOW()
        WHERE relationship.id=$1::uuid AND relationship.agent_user_id=$2::uuid AND relationship.status IN ('approved','active')
          AND EXISTS (SELECT 1 FROM day_sheet_access_grants grant_record
            WHERE grant_record.entity_id=relationship.entity_id AND grant_record.user_id=relationship.agent_user_id
              AND grant_record.revoked_at IS NULL AND (grant_record.expires_at IS NULL OR grant_record.expires_at>NOW()))
        RETURNING relationship.entity_id,relationship.agent_user_id,relationship.commission_percentage,relationship.profile_snapshot`,
      [req.params.id, req.userId]);
      if (!activated.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: { message: 'This approval is no longer available' } }); }
      const relationship = activated.rows[0];
      const profile = relationship.profile_snapshot || {};
      await client.query(`INSERT INTO booking_agent_profiles(user_id,display_name,agency_name)
        VALUES ($1::uuid,$2,$3)
        ON CONFLICT (user_id) DO UPDATE SET display_name=EXCLUDED.display_name,
          agency_name=EXCLUDED.agency_name,updated_at=NOW()`,
      [relationship.agent_user_id, profile.displayName, profile.agencyName || null]);
      await client.query(`INSERT INTO collaborator_workspace_profiles(user_id,entity_id,agency_name,commission_percentage)
        VALUES ($1::uuid,$2::uuid,$3,$4)
        ON CONFLICT (user_id,entity_id) DO UPDATE SET agency_name=EXCLUDED.agency_name,
          commission_percentage=COALESCE(EXCLUDED.commission_percentage,collaborator_workspace_profiles.commission_percentage),updated_at=NOW()`,
      [relationship.agent_user_id, relationship.entity_id, profile.agencyName || null, relationship.commission_percentage]);
      const entity = await client.query('SELECT name FROM entities WHERE id=$1::uuid', [relationship.entity_id]);
      await client.query('COMMIT');
      res.json({ activation: { relationshipId: req.params.id, entityId: relationship.entity_id, entityName: entity.rows[0]?.name || 'the artist' } });
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
  });

  router.post('/booking-agent-activations/:id/confirm', async (req, res) => {
    if (!UUID.test(req.params.id)) return res.status(422).json({ error: { message: 'Invalid booking-agent activation' } });
    const result = await pool.query(`SELECT relationship.id,relationship.activation_email_sent_at,
        entity.name entity_name,users.email
      FROM artist_agent_relationships relationship
      JOIN entities entity ON entity.id=relationship.entity_id
      JOIN users ON users.id=relationship.agent_user_id
      WHERE relationship.id=$1::uuid AND relationship.agent_user_id=$2::uuid AND relationship.status='active'`, [req.params.id, req.userId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Active booking-agent relationship not found' } });
    const activation = result.rows[0];
    if (!activation.activation_email_sent_at) {
      await sendTransactionalEmail({
        to: activation.email,
        subject: 'Your SceneGen booking-agent access is active',
        heading: 'Your booking-agent profile is now active',
        body: `${activation.entity_name} is now in your represented-band roster. You can access assigned shows and day sheets, propose shows within your granted territories, and add relationships with other bands. Each artist still controls its own permissions and financial access.`,
        action: 'Open booking-agent workspace', actionUrl: `${publicFrontendUrl()}/agent`, category: 'booking-agent-activation',
      });
      await pool.query('UPDATE artist_agent_relationships SET activation_email_sent_at=NOW(),updated_at=NOW() WHERE id=$1::uuid AND activation_email_sent_at IS NULL', [req.params.id]);
    }
    res.json({ success: true });
  });

  router.post('/booking-agent-upgrade-requests/:entityId', async (req, res) => {
    if (!UUID.test(req.params.entityId)) return res.status(422).json({ error: { message: 'Choose a valid represented band' } });
    const displayName = clean(req.body.displayName);
    const agencyName = clean(req.body.agencyName) || null;
    const commission = req.body.commissionPercentage === '' || req.body.commissionPercentage == null
      ? null : Number(req.body.commissionPercentage);
    if (displayName.length < 2 || displayName.length > 120) return res.status(422).json({ error: { message: 'Enter your professional name (2–120 characters)' } });
    if (agencyName && agencyName.length > 200) return res.status(422).json({ error: { message: 'Agency name must be 200 characters or fewer' } });
    if (commission != null && (!Number.isFinite(commission) || commission < 0 || commission > 100)) return res.status(422).json({ error: { message: 'Commission must be between 0 and 100' } });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const access = await client.query(`SELECT entity.name,
          jsonb_agg(jsonb_build_object('grantId', grant_record.id, 'scopeType', grant_record.scope_type,
            'countries', grant_record.countries, 'tourId', grant_record.tour_id, 'showId', grant_record.show_id,
            'editScope', grant_record.edit_scope, 'financialAccess', grant_record.financial_access,
            'requireApproval', grant_record.require_approval, 'canProposeShows', grant_record.can_propose_shows)
            ORDER BY grant_record.created_at) permissions
        FROM entities entity JOIN day_sheet_access_grants grant_record ON grant_record.entity_id=entity.id
        WHERE entity.id=$1::uuid AND grant_record.user_id=$2::uuid AND grant_record.revoked_at IS NULL
          AND grant_record.access_role NOT IN ('band_member','crew_member')
          AND (grant_record.expires_at IS NULL OR grant_record.expires_at>NOW())
        GROUP BY entity.id, entity.name`, [req.params.entityId, req.userId]);
      if (!access.rowCount) { await client.query('ROLLBACK'); return res.status(403).json({ error: { message: 'You need active access from this band before requesting representation' } }); }
      const inserted = await client.query(`INSERT INTO artist_agent_relationships
          (entity_id,agent_user_id,status,commission_percentage,profile_snapshot,permission_snapshot,requested_by)
        VALUES ($1::uuid,$2::uuid,'requested',$3,$4::jsonb,$5::jsonb,$2::uuid)
        RETURNING id,entity_id,status,commission_percentage,requested_at`,
      [req.params.entityId, req.userId, commission, JSON.stringify({ displayName, agencyName }), JSON.stringify(access.rows[0].permissions || [])]);
      const relationship = inserted.rows[0];
      await client.query(`INSERT INTO notifications(user_id,entity_id,type,title,message,action_url)
        SELECT recipient.user_id,$1::uuid,'booking_agent_request','Booking-agent request',
          $2 || CASE WHEN $3::text IS NULL THEN '' ELSE ' of ' || $3::text END || ' has asked to represent ' || $4 || '.',
          '/settings?tab=access'
        FROM (SELECT administrator_id::uuid user_id FROM entities WHERE id=$1::uuid
          UNION SELECT user_id FROM entity_memberships WHERE entity_id=$1::uuid AND status='active' AND role='admin') recipient`,
      [req.params.entityId, displayName, agencyName, access.rows[0].name]);
      await client.query('COMMIT');
      res.status(201).json({ request: { ...relationship, entity_name: access.rows[0].name } });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.code === '23505') return res.status(409).json({ error: { message: 'A current booking-agent relationship or request already exists for this band' } });
      throw error;
    } finally { client.release(); }
  });

  router.get('/booking-agent-relationships', async (req, res) => {
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    const result = await pool.query(`SELECT relationship.id,relationship.status,relationship.commission_percentage,
        relationship.profile_snapshot,relationship.permission_snapshot,relationship.requested_at,relationship.decided_at,relationship.decision_note,
        users.email,COALESCE(profile.display_name,relationship.profile_snapshot->>'displayName') display_name,
        COALESCE(profile.agency_name,relationship.profile_snapshot->>'agencyName') agency_name
      FROM artist_agent_relationships relationship
      JOIN users ON users.id=relationship.agent_user_id
      LEFT JOIN booking_agent_profiles profile ON profile.user_id=relationship.agent_user_id
      WHERE relationship.entity_id=$1::uuid
        AND relationship.status IN ('requested','changes_requested','approved','active','paused')
      ORDER BY relationship.updated_at DESC`, [req.entityId]);
    res.json({ relationships: result.rows });
  });

  router.patch('/booking-agent-relationships/:id', async (req, res) => {
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    if (!UUID.test(req.params.id)) return res.status(422).json({ error: { message: 'Invalid representation request' } });
    const decision = clean(req.body.decision);
    const note = clean(req.body.note).slice(0, 1000) || null;
    if (!['approve', 'decline'].includes(decision)) return res.status(422).json({ error: { message: 'Choose approve or decline' } });
    const nextStatus = decision === 'approve' ? 'approved' : 'declined';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await client.query(`UPDATE artist_agent_relationships relationship SET
          status=$1,decided_by=$2::uuid,decision_note=$3,decided_at=NOW(),
          updated_at=NOW()
        WHERE relationship.id=$4::uuid AND relationship.entity_id=$5::uuid AND relationship.status IN ('requested','changes_requested')
          AND EXISTS (SELECT 1 FROM day_sheet_access_grants grant_record
            WHERE grant_record.entity_id=relationship.entity_id AND grant_record.user_id=relationship.agent_user_id
              AND grant_record.revoked_at IS NULL AND (grant_record.expires_at IS NULL OR grant_record.expires_at>NOW()))
        RETURNING relationship.agent_user_id,relationship.status,relationship.commission_percentage,relationship.profile_snapshot`, [nextStatus, req.userId, note, req.params.id, req.entityId]);
      if (!updated.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: { message: 'This request is no longer pending or its day-sheet access has ended' } }); }
      const entity = await client.query('SELECT name FROM entities WHERE id=$1::uuid', [req.entityId]);
      await client.query(`INSERT INTO notifications(user_id,entity_id,type,title,message,action_url)
        VALUES ($1,$2::uuid,'booking_agent_decision',$3,$4,'/external-day-sheets')`, [updated.rows[0].agent_user_id, req.entityId,
        decision === 'approve' ? 'Representation approved' : 'Representation request declined',
        `${entity.rows[0]?.name || 'The artist'} ${decision === 'approve' ? 'approved' : 'declined'} your booking-agent request.`]);
      await client.query('COMMIT');
      res.json({ relationship: { id: req.params.id, status: nextStatus, decisionNote: note } });
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
  });

  router.delete('/booking-agent-relationships/:id', async (req, res) => {
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    if (!UUID.test(req.params.id)) return res.status(422).json({ error: { message: 'Invalid booking-agent relationship' } });
    const result = await pool.query(`UPDATE artist_agent_relationships SET
        status='ended',ended_at=NOW(),updated_at=NOW(),decided_by=$1::uuid,
        decision_note='Booking-agent status removed by the artist workspace'
      WHERE id=$2::uuid AND entity_id=$3::uuid
        AND status IN ('requested','changes_requested','approved','active','paused')
      RETURNING agent_user_id`, [req.userId, req.params.id, req.entityId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Current booking-agent relationship not found' } });
    res.json({ success: true });
  });

  router.get('/day-sheet-collaborators', async (req, res) => {
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    const [access, countries, tours, shows] = await Promise.all([
        pool.query(`SELECT 'grant' kind, g.id, u.email, COALESCE(NULLIF(g.recipient_name, ''), u.name) name, g.access_level, g.edit_scope, g.financial_access, g.require_approval, g.can_propose_shows, g.access_role, g.scope_type, g.countries,
          g.tour_id, g.show_id, g.created_at, g.expires_at, 'active' status, NULL::text invite_token_encrypted,
          t.name tour_name, COALESCE(s.festival_name, s.venue_name, s.city) || ' — ' || to_char(s.date, 'DD Mon YYYY') show_label
        FROM day_sheet_access_grants g JOIN users u ON u.id = g.user_id
        LEFT JOIN tours t ON t.id = g.tour_id LEFT JOIN shows s ON s.id = g.show_id
        WHERE g.entity_id = $1 AND g.revoked_at IS NULL
        UNION ALL
        SELECT 'invite', i.id, i.email, i.recipient_name AS name, i.access_level, i.edit_scope, i.financial_access, i.require_approval, i.can_propose_shows, i.access_role, i.scope_type, i.countries,
          i.tour_id, i.show_id, i.created_at, i.expires_at, i.status, i.invite_token_encrypted,
          t.name, COALESCE(s.festival_name, s.venue_name, s.city) || ' — ' || to_char(s.date, 'DD Mon YYYY')
        FROM day_sheet_access_invites i
        LEFT JOIN tours t ON t.id = i.tour_id LEFT JOIN shows s ON s.id = i.show_id
        WHERE i.entity_id = $1 AND i.status = 'pending'
        ORDER BY created_at DESC`, [req.entityId]),
      pool.query(`SELECT DISTINCT country FROM (
          SELECT unnest(countries) country FROM day_sheet_access_grants
          WHERE entity_id = $1 AND revoked_at IS NULL AND scope_type = 'countries'
          UNION
          SELECT unnest(countries) country FROM day_sheet_access_invites
          WHERE entity_id = $1 AND status IN ('pending', 'accepted') AND scope_type = 'countries'
        ) selected WHERE NULLIF(trim(country), '') IS NOT NULL ORDER BY country`, [req.entityId]),
      pool.query(`SELECT id, name FROM tours WHERE entity_id = $1 ORDER BY start_date DESC NULLS LAST, name`, [req.entityId]),
      pool.query(`SELECT id, COALESCE(NULLIF(festival_name, ''), NULLIF(venue_name, ''), NULLIF(city, ''), 'Day sheet') label, date, city, country
        FROM shows WHERE entity_id = $1 ORDER BY date DESC NULLS LAST, id`, [req.entityId]),
    ]);
    res.json({
      collaborators: access.rows.map((row) => {
        const inviteToken = row.kind === 'invite' ? decryptInviteToken(row.invite_token_encrypted) : null;
        const safeRow = { ...row };
        delete safeRow.invite_token_encrypted;
        return { ...safeRow, scope_label: scopeLabel(row), access_link: inviteToken ? `${publicFrontendUrl()}/day-sheet-invite/${inviteToken}` : null };
      }),
      countries: countries.rows.map((row) => row.country), tours: tours.rows, shows: shows.rows,
    });
  });

  router.post('/day-sheet-collaborators/invite', async (req, res) => {
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    const recipient = email(req.body.email);
    const recipientName = clean(req.body.name);
    const accessRole = ['band_member', 'crew_member'].includes(req.body.accessRole) ? req.body.accessRole : 'collaborator';
    const restrictedAccess = accessRole !== 'collaborator';
    const editScope = restrictedAccess ? 'none' : (['none', 'advance', 'full'].includes(req.body.editScope) ? req.body.editScope : (req.body.accessLevel === 'viewer' ? 'none' : 'full'));
    const financialAccess = restrictedAccess ? 'hidden' : (['hidden', 'view', 'edit'].includes(req.body.financialAccess) ? req.body.financialAccess : 'hidden');
    const requireApproval = restrictedAccess ? false : req.body.requireApproval !== false;
    const accessLevel = editScope === 'none' && financialAccess !== 'edit' ? 'viewer' : 'editor';
    const scopeType = clean(req.body.scopeType);
    const canProposeShows = restrictedAccess ? false : ['all', 'countries'].includes(scopeType) && req.body.canProposeShows !== false;
    const inviteAsBookingAgent = restrictedAccess ? false : req.body.inviteAsBookingAgent === true;
    const bookingAgentCommission = req.body.bookingAgentCommission === '' || req.body.bookingAgentCommission == null
      ? null : Number(req.body.bookingAgentCommission);
    const countries = Array.isArray(req.body.countries) ? [...new Set(req.body.countries.map(clean).filter(Boolean))] : [];
    const tourId = scopeType === 'tour' ? clean(req.body.tourId) : null;
    const showId = scopeType === 'show' ? clean(req.body.showId) : null;
    if (!singleEmail.test(recipient)) return res.status(422).json({ error: { message: 'Enter one valid email address' } });
    if (!recipientName || recipientName.length > 120) return res.status(422).json({ error: { message: 'Enter the collaborator’s name (120 characters or fewer)' } });
    if (!['all', 'countries', 'tour', 'show'].includes(scopeType)) return res.status(422).json({ error: { message: 'Choose which day sheets this person can access' } });
    if (scopeType === 'countries' && !countries.length) return res.status(422).json({ error: { message: 'Choose at least one country' } });
    if (scopeType === 'countries' && countries.some((territory) => !validTerritory(territory))) return res.status(422).json({ error: { message: 'Choose a valid country or continent' } });
    if ((scopeType === 'tour' && !tourId) || (scopeType === 'show' && !showId)) return res.status(422).json({ error: { message: 'Choose the tour or day sheet' } });
    if (bookingAgentCommission != null && (!Number.isFinite(bookingAgentCommission) || bookingAgentCommission < 0 || bookingAgentCommission > 100)) return res.status(422).json({ error: { message: 'Booking-agent commission must be between 0 and 100' } });
    if (tourId) {
      const found = await pool.query('SELECT 1 FROM tours WHERE id = $1 AND entity_id = $2', [tourId, req.entityId]);
      if (!found.rowCount) return res.status(422).json({ error: { message: 'That tour is not in this workspace' } });
    }
    if (showId) {
      const found = await pool.query('SELECT 1 FROM shows WHERE id = $1 AND entity_id = $2', [showId, req.entityId]);
      if (!found.rowCount) return res.status(422).json({ error: { message: 'That day sheet is not in this workspace' } });
    }
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresInDays = Math.min(365, Math.max(1, Number(req.body.expiresInDays) || 30));
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000);
    const client = await pool.connect();
    let result;
    let updatedExisting = false;
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${req.entityId}:${recipient}`]);
      if (territoryExclusivityApplies(scopeType)) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [String(req.entityId)]);
        const conflicts = await client.query(`SELECT owner_email, countries FROM (
          SELECT u.email owner_email, g.countries FROM day_sheet_access_grants g JOIN users u ON u.id = g.user_id
            WHERE g.entity_id = $1 AND g.scope_type = 'countries' AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at > NOW())
          UNION ALL
          SELECT i.email owner_email, i.countries FROM day_sheet_access_invites i
            WHERE i.entity_id = $1 AND i.scope_type = 'countries' AND i.status = 'pending' AND i.expires_at > NOW()
        ) reserved WHERE lower(owner_email) <> $2`, [req.entityId, recipient]);
        const conflict = conflicts.rows.find((row) => overlaps(countries, row.countries));
        if (conflict) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: { code: 'TERRITORY_ALREADY_ASSIGNED', message: `This territory overlaps access already assigned to ${conflict.owner_email}. Edit or remove that permission first.` } });
        }
      }
      await client.query(`UPDATE day_sheet_access_invites SET status = 'revoked', revoked_at = NOW()
        WHERE entity_id::text = $1::text AND email = $2 AND scope_type = $3 AND status = 'pending' AND (
          $3 = 'all'
          OR ($3 = 'countries' AND countries @> $4::text[] AND countries <@ $4::text[])
          OR ($3 = 'tour' AND tour_id::text = $5::text)
          OR ($3 = 'show' AND show_id::text = $6::text)
        )`, [req.entityId, recipient, scopeType, countries, tourId, showId]);
      const existingUser = await client.query('SELECT id FROM users WHERE lower(email) = $1 LIMIT 1', [recipient]);
      const matchingGrants = existingUser.rowCount
        ? await client.query(`SELECT id FROM day_sheet_access_grants
            WHERE entity_id::text = $1::text AND user_id = $2::uuid AND revoked_at IS NULL
              AND (expires_at IS NULL OR expires_at > NOW()) AND (
                ($3 = 'all' AND scope_type = 'all')
                OR ($3 = 'countries' AND scope_type = 'countries' AND countries @> $4::text[] AND countries <@ $4::text[])
                OR ($3 = 'tour' AND scope_type = 'tour' AND tour_id::text = $5::text)
                OR ($3 = 'show' AND scope_type = 'show' AND show_id::text = $6::text)
              )
            ORDER BY created_at DESC, id DESC FOR UPDATE`, [req.entityId, existingUser.rows[0].id, scopeType, countries, tourId, showId])
        : { rows: [], rowCount: 0 };
      if (matchingGrants.rowCount) {
        const grantId = matchingGrants.rows[0].id;
        result = await client.query(`UPDATE day_sheet_access_grants SET recipient_name=$1, access_level=$2,
          edit_scope=$3, financial_access=$4, require_approval=$5, can_propose_shows=$6, created_by=$7, expires_at=$8, access_role=$10
          WHERE id=$9 RETURNING id, recipient_name, access_level, edit_scope, financial_access,
            require_approval, can_propose_shows, scope_type, countries, tour_id, show_id, expires_at`,
          [recipientName, accessLevel, editScope, financialAccess, requireApproval, canProposeShows, req.userId, expiresAt, grantId, accessRole]);
        if (matchingGrants.rows.length > 1) await client.query(`UPDATE day_sheet_access_grants SET revoked_at = NOW()
          WHERE id = ANY($1::uuid[])`, [matchingGrants.rows.slice(1).map((grant) => grant.id)]);
        updatedExisting = true;
        if (inviteAsBookingAgent) await client.query(`INSERT INTO artist_agent_relationships
            (entity_id,agent_user_id,status,commission_percentage,profile_snapshot,permission_snapshot,requested_by,decided_by,decided_at)
          VALUES ($1::uuid,$2::uuid,'approved',$3,jsonb_build_object('displayName',$4::text),
            jsonb_build_array(jsonb_build_object('grantId',$5::text)),$6::uuid,$6::uuid,NOW())
          ON CONFLICT (entity_id,agent_user_id) WHERE status IN ('requested','changes_requested','approved','active','paused')
          DO UPDATE SET status='approved',commission_percentage=EXCLUDED.commission_percentage,
            profile_snapshot=EXCLUDED.profile_snapshot,permission_snapshot=EXCLUDED.permission_snapshot,
            requested_by=EXCLUDED.requested_by,decided_by=EXCLUDED.decided_by,decided_at=NOW(),
            activated_at=NULL,ended_at=NULL,updated_at=NOW()`,
        [req.entityId, existingUser.rows[0].id, bookingAgentCommission, recipientName, grantId, req.userId]);
      } else {
        result = await client.query(`INSERT INTO day_sheet_access_invites
          (entity_id, email, recipient_name, access_level, edit_scope, financial_access, require_approval, can_propose_shows, scope_type, countries, tour_id, show_id, token_hash, invite_token_encrypted, created_by, expires_at, invite_as_booking_agent, booking_agent_commission, access_role)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id, email, recipient_name, access_level, edit_scope, financial_access, require_approval, can_propose_shows, scope_type, countries, expires_at, invite_as_booking_agent, booking_agent_commission, access_role`,
          [req.entityId, recipient, recipientName, accessLevel, editScope, financialAccess, requireApproval, canProposeShows, scopeType, countries, tourId, showId, tokenHash(token), encryptInviteToken(token), req.userId, expiresAt, inviteAsBookingAgent, bookingAgentCommission, accessRole]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    const invitePath = updatedExisting ? '/external-day-sheets' : `/day-sheet-invite/${token}`;
    const inviteUrl = `${publicFrontendUrl()}${invitePath}`;
    let emailDelivery = 'sent';
    if (!updatedExisting || inviteAsBookingAgent) try {
      const workspace = await pool.query('SELECT name FROM entities WHERE id::text = $1::text LIMIT 1', [req.entityId]);
      await sendDaySheetInvitation({
        to: recipient,
        recipientName,
        entityName: workspace.rows[0]?.name || 'A SceneGen workspace',
        scope: scopeLabel(result.rows[0]),
        invitationUrl: inviteUrl,
        inviteAsBookingAgent,
        accessRole,
      });
    } catch (error) {
      emailDelivery = 'failed';
      console.error('Day-sheet invitation email delivery failed:', error instanceof Error ? error.message : 'Unknown error');
    } else emailDelivery = 'not-required';
    if (updatedExisting) return res.json({ grant: result.rows[0], updatedExisting: true, emailDelivery });
    res.status(201).json({ invite: result.rows[0], invitePath, inviteUrl, emailDelivery });
  });

  router.post('/day-sheet-collaborators/invite/:id/refresh-link', async (req, res) => {
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: { message: 'Invalid invitation' } });
    const token = crypto.randomBytes(32).toString('base64url');
    const result = await pool.query(`UPDATE day_sheet_access_invites
      SET token_hash=$1, invite_token_encrypted=$2, expires_at=GREATEST(expires_at, NOW() + INTERVAL '30 days')
      WHERE id=$3::uuid AND entity_id::text=$4::text AND status='pending' AND revoked_at IS NULL
      RETURNING id, expires_at`, [tokenHash(token), encryptInviteToken(token), req.params.id, req.entityId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'This pending invitation is no longer available. Create a new invitation instead.' } });
    const invitePath = `/day-sheet-invite/${token}`;
    res.json({ invitePath, inviteUrl: `${publicFrontendUrl()}${invitePath}`, expiresAt: result.rows[0].expires_at });
  });

  router.get('/day-sheet-invitations/:token', async (req, res) => {
    const result = await pool.query(`SELECT i.email, i.access_level, i.edit_scope, i.financial_access, i.require_approval, i.can_propose_shows, i.access_role, i.scope_type, i.countries, i.status, i.expires_at,
        i.invite_as_booking_agent,
        CASE WHEN i.accepted_by IS NOT NULL AND accepted_user.password_hash IS NULL THEN true ELSE false END requires_password,
        CASE WHEN i.invite_as_booking_agent AND i.accepted_by IS NOT NULL THEN (
          SELECT relationship.id::text FROM artist_agent_relationships relationship
          WHERE relationship.entity_id=i.entity_id AND relationship.agent_user_id=i.accepted_by
            AND relationship.status IN ('approved','active','paused')
          ORDER BY relationship.updated_at DESC LIMIT 1
        ) ELSE NULL END booking_agent_relationship_id,
        e.name entity_name, t.name tour_name,
        COALESCE(s.venue_name, s.city) || ' — ' || to_char(s.date, 'DD Mon YYYY') show_label
      FROM day_sheet_access_invites i JOIN entities e ON e.id = i.entity_id
      LEFT JOIN users accepted_user ON accepted_user.id=i.accepted_by
      LEFT JOIN tours t ON t.id = i.tour_id LEFT JOIN shows s ON s.id = i.show_id
      WHERE i.token_hash = $1`, [tokenHash(req.params.token)]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Invitation not found' } });
    const invitation = result.rows[0];
    if (!['pending', 'accepted'].includes(invitation.status) || new Date(invitation.expires_at) <= new Date()) return res.status(410).json({ error: { message: 'This invitation is no longer active' } });
    res.json({ invitation: { ...invitation, scope_label: scopeLabel(invitation) } });
  });

  router.post('/day-sheet-invitations/:token/accept', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`SELECT * FROM day_sheet_access_invites WHERE token_hash = $1 FOR UPDATE`, [tokenHash(req.params.token)]);
      if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Invitation not found' } }); }
      const invitation = result.rows[0];
      if (!['pending', 'accepted'].includes(invitation.status) || invitation.revoked_at || new Date(invitation.expires_at) <= new Date()) { await client.query('ROLLBACK'); return res.status(410).json({ error: { message: 'This invitation is no longer active' } }); }
      if (invitation.status === 'accepted' && String(invitation.accepted_by || '') !== String(req.userId)) { await client.query('ROLLBACK'); return res.status(403).json({ error: { message: 'This invitation belongs to another collaborator account' } }); }
      const user = await client.query('SELECT email,password_hash FROM users WHERE id = $1', [req.userId]);
      if (!user.rowCount || email(user.rows[0].email) !== email(req.headers['x-user-email'])) { await client.query('ROLLBACK'); return res.status(403).json({ error: { message: 'Your signed-in email could not be verified' } }); }
      if (email(user.rows[0].email) !== invitation.email) { await client.query('ROLLBACK'); return res.status(403).json({ error: { message: `Sign in as ${invitation.email} to accept this invitation` } }); }
      const acceptedGrant = await client.query(`INSERT INTO day_sheet_access_grants
        (entity_id,user_id,source_invite_id,recipient_name,access_level,edit_scope,financial_access,require_approval,can_propose_shows,scope_type,countries,tour_id,show_id,created_by,expires_at,access_role)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (source_invite_id) WHERE source_invite_id IS NOT NULL DO UPDATE SET
          entity_id=EXCLUDED.entity_id, user_id=EXCLUDED.user_id,
          recipient_name=EXCLUDED.recipient_name, access_level=EXCLUDED.access_level,
          edit_scope=EXCLUDED.edit_scope, financial_access=EXCLUDED.financial_access,
          require_approval=EXCLUDED.require_approval, can_propose_shows=EXCLUDED.can_propose_shows, scope_type=EXCLUDED.scope_type,
          countries=EXCLUDED.countries, tour_id=EXCLUDED.tour_id, show_id=EXCLUDED.show_id,
          created_by=EXCLUDED.created_by, expires_at=EXCLUDED.expires_at, access_role=EXCLUDED.access_role, revoked_at=NULL
        RETURNING id`,
        [invitation.entity_id, req.userId, invitation.id, invitation.recipient_name, invitation.access_level, invitation.edit_scope, invitation.financial_access, invitation.require_approval, invitation.can_propose_shows, invitation.scope_type, invitation.countries, invitation.tour_id, invitation.show_id, invitation.created_by, invitation.expires_at, invitation.access_role || 'collaborator']);
      await client.query(`UPDATE day_sheet_access_invites SET status='accepted', accepted_by=$2,
        accepted_at=COALESCE(accepted_at,NOW()), revoked_at=NULL WHERE id=$1`, [invitation.id, req.userId]);
      let bookingAgentRelationshipId = null;
      if (invitation.invite_as_booking_agent && !['band_member', 'crew_member'].includes(invitation.access_role)) {
        const relationship = await client.query(`INSERT INTO artist_agent_relationships
            (entity_id,agent_user_id,status,commission_percentage,profile_snapshot,permission_snapshot,requested_by,decided_by,decided_at)
          VALUES ($1::uuid,$2::uuid,'approved',$3,jsonb_build_object('displayName',$4::text),
            jsonb_build_array(jsonb_build_object('grantId',$5::text)),$6::uuid,$6::uuid,NOW())
          ON CONFLICT (entity_id,agent_user_id) WHERE status IN ('requested','changes_requested','approved','active','paused')
          DO UPDATE SET status='approved',commission_percentage=EXCLUDED.commission_percentage,
            profile_snapshot=EXCLUDED.profile_snapshot,permission_snapshot=EXCLUDED.permission_snapshot,
            requested_by=EXCLUDED.requested_by,decided_by=EXCLUDED.decided_by,decided_at=NOW(),
            activated_at=NULL,ended_at=NULL,updated_at=NOW()
          RETURNING id`,
        [invitation.entity_id, req.userId, invitation.booking_agent_commission, invitation.recipient_name, acceptedGrant.rows[0].id, invitation.created_by]);
        bookingAgentRelationshipId = relationship.rows[0]?.id || null;
      }
      // Accepting a link delivered to the invited address proves control of that address.
      // This also lets collaborators create/reset a password for durable portal access.
      await client.query(`UPDATE users SET email_verified_at=COALESCE(email_verified_at, NOW()), updated_at=NOW() WHERE id=$1`, [req.userId]);
      await client.query('COMMIT');
      res.json({ success: true, requiresPassword: !user.rows[0].password_hash, bookingAgentRelationshipId });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  });

  router.delete('/day-sheet-collaborators/:kind/:id', async (req, res) => {
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    if (!['grant', 'invite'].includes(req.params.kind) || !/^[0-9a-f-]{36}$/i.test(req.params.id)) {
      return res.status(400).json({ error: { message: 'Invalid access record' } });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let result;
      if (req.params.kind === 'grant') {
        result = await client.query(`UPDATE day_sheet_access_grants SET revoked_at = NOW()
          WHERE id::text = $1 AND entity_id::text = $2 AND revoked_at IS NULL RETURNING source_invite_id,user_id`, [req.params.id, req.entityId]);
        if (result.rows[0]?.source_invite_id) await client.query(`UPDATE day_sheet_access_invites
          SET status='revoked', revoked_at=NOW() WHERE id=$1 AND entity_id::text=$2 AND revoked_at IS NULL`,
          [result.rows[0].source_invite_id, req.entityId]);
      } else {
        result = await client.query(`UPDATE day_sheet_access_invites SET status='revoked', revoked_at=NOW()
          WHERE id::text=$1 AND entity_id::text=$2 AND revoked_at IS NULL RETURNING id,email,accepted_by`, [req.params.id, req.entityId]);
        if (result.rowCount) await client.query(`UPDATE day_sheet_access_grants SET revoked_at=NOW()
          WHERE source_invite_id=$1::uuid AND entity_id::text=$2 AND revoked_at IS NULL`, [req.params.id, req.entityId]);
      }
      if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Access record not found' } }); }
      await client.query('COMMIT');
      res.json({ success: true, mode: 'permission' });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Failed to revoke day-sheet access:', error.message);
      res.status(500).json({ error: { message: 'Access could not be removed' } });
    } finally { client.release(); }
  });

  router.patch('/day-sheet-collaborators/:kind/:id', async (req, res) => {
    if (!['owner', 'admin'].includes(req.entityRole)) return res.status(403).json({ error: { message: 'Administrator access is required' } });
    const { kind, id } = req.params;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!['grant', 'invite'].includes(kind) || !uuid.test(id)) return res.status(400).json({ error: { message: 'Invalid access record' } });
    const recipientName = clean(req.body.name);
    if (!recipientName || recipientName.length > 120) return res.status(422).json({ error: { message: 'Enter the collaborator’s name (120 characters or fewer)' } });
    const editScope = ['none', 'advance', 'full'].includes(req.body.editScope) ? req.body.editScope : null;
    const financialAccess = ['hidden', 'view', 'edit'].includes(req.body.financialAccess) ? req.body.financialAccess : null;
    const scopeType = clean(req.body.scopeType);
    const canProposeShows = ['all', 'countries'].includes(scopeType) && req.body.canProposeShows !== false;
    const countries = Array.isArray(req.body.countries) ? [...new Set(req.body.countries.map(clean).filter(Boolean))] : [];
    const tourId = scopeType === 'tour' ? clean(req.body.tourId) : null;
    const showId = scopeType === 'show' ? clean(req.body.showId) : null;
    if (!editScope || !financialAccess) return res.status(422).json({ error: { message: 'Choose valid day-sheet and financial permissions' } });
    if (!['all', 'countries', 'tour', 'show'].includes(scopeType)) return res.status(422).json({ error: { message: 'Choose which day sheets this person can access' } });
    if (scopeType === 'countries' && (!countries.length || countries.some((territory) => !validTerritory(territory)))) return res.status(422).json({ error: { message: 'Choose at least one valid country or continent' } });
    if ((scopeType === 'tour' && !uuid.test(tourId || '')) || (scopeType === 'show' && !uuid.test(showId || ''))) return res.status(422).json({ error: { message: 'Choose a valid tour or day sheet' } });
    if (tourId && !(await pool.query('SELECT 1 FROM tours WHERE id = $1 AND entity_id::text = $2::text', [tourId, req.entityId])).rowCount) return res.status(422).json({ error: { message: 'That tour is not in this workspace' } });
    if (showId && !(await pool.query('SELECT 1 FROM shows WHERE id = $1 AND entity_id::text = $2::text', [showId, req.entityId])).rowCount) return res.status(422).json({ error: { message: 'That day sheet is not in this workspace' } });
    let effectiveId = id;
    let table = kind === 'invite' ? 'day_sheet_access_invites' : 'day_sheet_access_grants';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let owner = kind === 'invite'
        ? await client.query(`SELECT email, status, accepted_by, scope_type, countries, tour_id, show_id, created_by FROM ${table}
            WHERE id::text = $1 AND entity_id::text = $2::text AND status IN ('pending', 'accepted') AND revoked_at IS NULL FOR UPDATE`, [id, req.entityId])
        : await client.query(`SELECT u.email FROM ${table} record JOIN users u ON u.id = record.user_id WHERE record.id = $1 AND record.entity_id::text = $2::text AND record.revoked_at IS NULL FOR UPDATE OF record`, [id, req.entityId]);
      if (kind === 'invite' && owner.rows[0]?.status === 'accepted') {
        const invitation = owner.rows[0];
        if (!invitation.accepted_by) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'The accepted invitation has no collaborator account' } }); }
        let grant = await client.query(`SELECT g.id::text id, g.revoked_at, u.email FROM day_sheet_access_grants g JOIN users u ON u.id = g.user_id
          WHERE g.source_invite_id = $1::uuid AND g.entity_id::text = $2::text AND g.user_id = $3::uuid
          LIMIT 1 FOR UPDATE OF g`, [id, req.entityId, invitation.accepted_by]);
        if (grant.rows[0]?.revoked_at) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'This collaborator access has been removed' } }); }
        if (!grant.rowCount) {
          grant = await client.query(`SELECT g.id::text id, u.email FROM day_sheet_access_grants g JOIN users u ON u.id = g.user_id
            WHERE g.entity_id::text = $1::text AND g.user_id = $2::uuid AND g.created_by = $3::uuid AND g.revoked_at IS NULL
              AND g.scope_type = $4 AND g.countries = $5::text[]
              AND g.tour_id::text IS NOT DISTINCT FROM $6::text AND g.show_id::text IS NOT DISTINCT FROM $7::text
            ORDER BY g.created_at DESC LIMIT 1 FOR UPDATE OF g`, [req.entityId, invitation.accepted_by, invitation.created_by, invitation.scope_type, invitation.countries, invitation.tour_id, invitation.show_id]);
          if (grant.rowCount) await client.query('UPDATE day_sheet_access_grants SET source_invite_id = $1::uuid WHERE id::text = $2 AND source_invite_id IS NULL', [id, grant.rows[0].id]);
        }
        if (!grant.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'The accepted access grant could not be found. Reload the page and try again.' } }); }
        effectiveId = grant.rows[0].id;
        table = 'day_sheet_access_grants';
        owner = grant;
      }
      if (!owner.rowCount && /^\S+@\S+\.\S+$/.test(email(req.body.email))) {
        const originalScope = clean(req.body.originalScopeType);
        const originalCountries = Array.isArray(req.body.originalCountries) ? [...new Set(req.body.originalCountries.map(clean).filter(Boolean))] : [];
        const originalTourId = clean(req.body.originalTourId) || null;
        const originalShowId = clean(req.body.originalShowId) || null;
        const validOriginalScope = ['all', 'countries', 'tour', 'show'].includes(originalScope)
          && (originalScope !== 'countries' || (originalCountries.length > 0 && originalCountries.every(validTerritory)))
          && (originalScope !== 'tour' || uuid.test(originalTourId || ''))
          && (originalScope !== 'show' || uuid.test(originalShowId || ''));
        if (validOriginalScope) {
          const user = await client.query('SELECT id FROM users WHERE lower(email) = $1 LIMIT 1', [email(req.body.email)]);
          if (user.rowCount) {
            const grant = await client.query(`SELECT g.id::text id, u.email FROM day_sheet_access_grants g JOIN users u ON u.id = g.user_id
              WHERE g.entity_id::text=$1::text AND g.user_id=$2::uuid AND g.revoked_at IS NULL
                AND g.scope_type=$3
                AND ($3<>'countries' OR (g.countries @> $4::text[] AND g.countries <@ $4::text[]))
                AND ($3<>'tour' OR g.tour_id::text=$5::text)
                AND ($3<>'show' OR g.show_id::text=$6::text)
              ORDER BY g.created_at DESC LIMIT 1 FOR UPDATE OF g`, [req.entityId, user.rows[0].id, originalScope, originalCountries, originalTourId, originalShowId]);
            if (grant.rowCount) { owner = grant; effectiveId = grant.rows[0].id; table = 'day_sheet_access_grants'; }
          }
          if (!owner.rowCount) {
            const invite = await client.query(`SELECT id::text id, email FROM day_sheet_access_invites
              WHERE entity_id::text=$1::text AND lower(email)=$2 AND status='pending' AND revoked_at IS NULL
                AND scope_type=$3
                AND ($3<>'countries' OR (countries @> $4::text[] AND countries <@ $4::text[]))
                AND ($3<>'tour' OR tour_id::text=$5::text)
                AND ($3<>'show' OR show_id::text=$6::text)
              ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [req.entityId, email(req.body.email), originalScope, originalCountries, originalTourId, originalShowId]);
            if (invite.rowCount) { owner = invite; effectiveId = invite.rows[0].id; table = 'day_sheet_access_invites'; }
          }
        }
      }
      if (!owner.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: { message: 'Access record not found. Reload the page to get the current record.' } }); }
      if (territoryExclusivityApplies(scopeType)) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [String(req.entityId)]);
        const conflicts = await client.query(`SELECT owner_email, countries FROM (
          SELECT u.email owner_email, g.countries FROM day_sheet_access_grants g JOIN users u ON u.id = g.user_id
            WHERE g.entity_id::text = $1::text AND g.id <> $3::uuid AND g.scope_type = 'countries' AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at > NOW())
          UNION ALL
          SELECT i.email owner_email, i.countries FROM day_sheet_access_invites i
            WHERE i.entity_id::text = $1::text AND i.id <> $3::uuid AND i.scope_type = 'countries' AND i.status = 'pending' AND i.expires_at > NOW()
        ) reserved WHERE lower(owner_email) <> $2`, [req.entityId, email(owner.rows[0].email), effectiveId]);
        const conflict = conflicts.rows.find((row) => overlaps(countries, row.countries));
        if (conflict) { await client.query('ROLLBACK'); return res.status(409).json({ error: { code: 'TERRITORY_ALREADY_ASSIGNED', message: `This territory overlaps access already assigned to ${conflict.owner_email}. Edit or remove that permission first.` } }); }
      }
      const accessLevel = editScope === 'none' && financialAccess !== 'edit' ? 'viewer' : 'editor';
      const requireApproval = (editScope !== 'none' || financialAccess === 'edit') && req.body.requireApproval !== false;
      await client.query(`UPDATE ${table} SET recipient_name=$1,
        access_level=CASE WHEN access_role IN ('band_member','crew_member') THEN 'viewer' ELSE $2 END,
        edit_scope=CASE WHEN access_role IN ('band_member','crew_member') THEN 'none' ELSE $3 END,
        financial_access=CASE WHEN access_role IN ('band_member','crew_member') THEN 'hidden' ELSE $4 END,
        require_approval=CASE WHEN access_role IN ('band_member','crew_member') THEN false ELSE $5 END,
        can_propose_shows=CASE WHEN access_role IN ('band_member','crew_member') THEN false ELSE $6 END,
        scope_type=$7, countries=$8, tour_id=$9, show_id=$10 WHERE id::text=$11 AND entity_id::text=$12::text RETURNING id`,
        [recipientName, accessLevel, editScope, financialAccess, requireApproval, canProposeShows, scopeType, countries, tourId, showId, effectiveId, req.entityId]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.constraint === 'idx_day_sheet_grants_source_invite') return res.status(409).json({ error: { message: 'The accepted access record changed. Reload the page and try again.' } });
      if (error.code === '23505') return res.status(409).json({ error: { message: 'A pending invitation already has those permissions' } });
      console.error('Failed to update day-sheet permissions:', error.message);
      res.status(500).json({ error: { message: 'Permissions could not be updated' } });
    } finally { client.release(); }
  });

  router.get('/my-day-sheets', async (req, res) => {
    try {
      const bookingAgentOnly = req.query.bookingAgentOnly === 'true';
      const [result, profileResult, accessResult] = await Promise.all([
        pool.query(`SELECT s.*,
          COALESCE(
            (SELECT min(upper(trim(budget.currency))) FROM budgets budget
              WHERE budget.show_id = s.id AND upper(trim(budget.currency)) ~ '^[A-Z]{3}$'
              HAVING count(DISTINCT upper(trim(budget.currency))) = 1),
            (SELECT upper(trim(tour.currency)) FROM tours tour WHERE tour.id = s.tour_id
              AND upper(trim(tour.currency)) ~ '^[A-Z]{3}$'),
            (SELECT min(upper(trim(budget.currency))) FROM budgets budget
              WHERE budget.tour_id = s.tour_id AND upper(trim(budget.currency)) ~ '^[A-Z]{3}$'
              HAVING count(DISTINCT upper(trim(budget.currency))) = 1),
            CASE WHEN upper(trim(s.currency)) ~ '^[A-Z]{3}$' THEN upper(trim(s.currency)) END
          ) currency,
          portal_tour.name portal_tour_name,
          e.name workspace_name,
          CASE WHEN agent_relationship.id IS NOT NULL
            THEN COALESCE(cwp.commission_percentage, agent_relationship.commission_percentage)
            ELSE NULL END workspace_commission_percentage,
          CASE WHEN g.access_role IN ('band_member','crew_member') THEN 'viewer' ELSE g.access_level END grant_access_level,
          CASE WHEN g.access_role IN ('band_member','crew_member') THEN 'hidden' ELSE g.financial_access END grant_financial_access,
          g.access_role grant_access_role,
          g.scope_type grant_scope_type, g.countries grant_countries,
          g.tour_id grant_tour_id, g.show_id grant_show_id
        FROM day_sheet_access_grants g
        JOIN shows s ON s.entity_id::text = g.entity_id::text
        JOIN entities e ON e.id::text = s.entity_id::text
        JOIN users u ON u.id = g.user_id
        LEFT JOIN collaborator_workspace_profiles cwp ON cwp.user_id = g.user_id AND cwp.entity_id = g.entity_id
        LEFT JOIN artist_agent_relationships agent_relationship ON agent_relationship.agent_user_id = g.user_id
          AND agent_relationship.entity_id = g.entity_id AND agent_relationship.status = 'active'
        LEFT JOIN tours portal_tour ON portal_tour.id = s.tour_id AND portal_tour.entity_id::text = s.entity_id::text
        WHERE g.user_id = $1 AND g.revoked_at IS NULL
          AND (g.expires_at IS NULL OR g.expires_at > NOW())
          AND ($2::boolean = false OR (
            agent_relationship.id IS NOT NULL
            AND s.date::date >= COALESCE(agent_relationship.activated_at, agent_relationship.decided_at, agent_relationship.requested_at)::date
          ))
        ORDER BY s.date DESC`, [req.userId, bookingAgentOnly]),
        pool.query(`SELECT u.email,
            COALESCE(NULLIF(trim(grant_name.name), ''), NULLIF(trim(u.collaborator_profile_name), ''), NULLIF(trim(u.name), '')) name,
          u.collaborator_profile_confirmed_at
          FROM users u
          LEFT JOIN LATERAL (
            SELECT g.recipient_name name FROM day_sheet_access_grants g
            WHERE g.user_id = u.id AND g.revoked_at IS NULL
              AND (g.expires_at IS NULL OR g.expires_at > NOW())
              AND NULLIF(trim(g.recipient_name), '') IS NOT NULL
            ORDER BY g.created_at DESC, g.id DESC LIMIT 1
          ) grant_name ON true
          WHERE u.id = $1::uuid AND lower(u.email) = lower($2)`, [req.userId, email(req.headers['x-user-email'])]),
        pool.query(`SELECT EXISTS (
          SELECT 1 FROM day_sheet_access_grants g
          WHERE g.user_id = $1::uuid AND g.revoked_at IS NULL
            AND (g.expires_at IS NULL OR g.expires_at > NOW())
        ) has_active_access`, [req.userId]),
      ]);
      const byShow = new Map();
      for (const row of result.rows) {
        const showCountry = resolveShowCountry(row.country, row.venue_address);
        const allowed = row.grant_scope_type === 'all'
          || (row.grant_scope_type === 'countries' && territoryMatches(row.grant_countries, showCountry))
          || (row.grant_scope_type === 'tour' && String(row.grant_tour_id) === String(row.tour_id))
          || (row.grant_scope_type === 'show' && String(row.grant_show_id) === String(row.id));
        if (!allowed) continue;
        row.country = showCountry || row.country;
        const key = String(row.id);
        byShow.set(key, mergePortalGrant(byShow.get(key), row));
      }
      const profile = profileResult.rows[0];
      res.json({ hasActiveAccess: Boolean(accessResult.rows[0]?.has_active_access), profile: profile ? {
        name: profile.name || '', email: profile.email,
        needsProfileConfirmation: !profile.collaborator_profile_confirmed_at,
      } : null, shows: [...byShow.values()].map((row) => {
        const show = serializeShow(row);
        if (row.grant_financial_access === 'hidden') {
          for (const key of ['fee', 'guaranteedFee', 'backendDeal', 'dealType', 'currency', 'isPaid', 'ticketPrice', 'guarantee', 'doorSplitPercentage', 'advanceTicketPrice', 'doorTicketPrice']) delete show[key];
        }
        if (['band_member', 'crew_member'].includes(row.grant_access_role)) {
          for (const key of ['contactName', 'contactPhone', 'contactEmail', 'promoterName', 'promoterPhone', 'promoterEmail', 'notes', 'feeNotes', 'feeText', 'commercialNotes']) delete show[key];
        }
        return { ...show, accessLevel: row.grant_access_level, financialAccess: row.grant_financial_access,
          accessRole: row.grant_access_role || 'collaborator',
          workspaceName: row.workspace_name, tourName: row.portal_tour_name || null,
          commissionPercentage: row.workspace_commission_percentage == null ? null : Number(row.workspace_commission_percentage) };
      }) });
    } catch (error) {
      console.error('Failed to fetch external day sheets:', error.message);
      res.status(500).json({ error: { code: 'DAY_SHEETS_UNAVAILABLE', message: 'Unable to load day sheets right now' } });
    }
  });

  router.get('/my-represented-workspaces', async (req, res) => {
    try {
      const result = await pool.query(`SELECT e.id, e.name,
          CASE WHEN agent_relationship.id IS NOT NULL
            THEN COALESCE(cwp.commission_percentage, agent_relationship.commission_percentage)
            ELSE NULL END commission_percentage,
          cwp.agency_name,
          array_agg(DISTINCT g.access_level ORDER BY g.access_level) access_levels,
          array_agg(DISTINCT g.edit_scope ORDER BY g.edit_scope) edit_scopes,
          array_agg(DISTINCT g.financial_access ORDER BY g.financial_access) financial_access,
          array_agg(DISTINCT g.access_role ORDER BY g.access_role) access_roles,
          bool_or(g.can_propose_shows) can_propose_shows,
          jsonb_agg(DISTINCT jsonb_build_object(
            'scopeType', g.scope_type,
            'countries', to_jsonb(g.countries),
            'tourId', g.tour_id,
            'showId', g.show_id
          )) grant_scopes,
          count(*)::int active_grant_count
        FROM day_sheet_access_grants g
        JOIN entities e ON e.id = g.entity_id
        JOIN users u ON u.id = g.user_id
        LEFT JOIN collaborator_workspace_profiles cwp ON cwp.user_id = g.user_id AND cwp.entity_id = g.entity_id
        JOIN artist_agent_relationships agent_relationship ON agent_relationship.agent_user_id = g.user_id
          AND agent_relationship.entity_id = g.entity_id AND agent_relationship.status = 'active'
        WHERE g.user_id = $1::uuid AND g.revoked_at IS NULL
          AND (g.expires_at IS NULL OR g.expires_at > NOW())
        GROUP BY e.id, e.name, cwp.commission_percentage, cwp.agency_name,
          agent_relationship.id, agent_relationship.commission_percentage
        ORDER BY lower(e.name), e.id`, [req.userId]);
      res.json({ workspaces: result.rows.map((row) => ({
        id: row.id, name: row.name, agencyName: row.agency_name || '',
        commissionPercentage: row.commission_percentage == null ? null : Number(row.commission_percentage),
        accessLevels: row.access_levels || [], editScopes: row.edit_scopes || [],
        financialAccess: row.financial_access || [], canProposeShows: Boolean(row.can_propose_shows),
        accessRoles: row.access_roles || ['collaborator'],
        grantScopes: row.grant_scopes || [],
        activeGrantCount: Number(row.active_grant_count || 0),
      })) });
    } catch (error) {
      console.error('Failed to fetch day-sheet workspaces:', error.message);
      res.status(500).json({ error: { message: 'Unable to load day-sheet workspaces right now' } });
    }
  });

  router.patch('/my-represented-workspaces/:entityId', async (req, res) => {
    if (!UUID.test(req.params.entityId)) return res.status(422).json({ error: { message: 'Choose a valid represented band' } });
    const suppliedCommission = req.body.commissionPercentage;
    const commissionPercentage = Number(suppliedCommission);
    const agencyNameSupplied = Object.hasOwn(req.body, 'agencyName');
    const agencyName = clean(req.body.agencyName) || null;
    if ((typeof suppliedCommission !== 'number' && typeof suppliedCommission !== 'string') || clean(suppliedCommission) === ''
      || !Number.isFinite(commissionPercentage) || commissionPercentage < 0 || commissionPercentage > 100) {
      return res.status(422).json({ error: { message: 'Enter a commission percentage from 0 to 100' } });
    }
    if (agencyName && agencyName.length > 200) return res.status(422).json({ error: { message: 'Agency name must be 200 characters or fewer' } });
    const result = await pool.query(`INSERT INTO collaborator_workspace_profiles
        (user_id, entity_id, commission_percentage, agency_name)
      SELECT $1::uuid, $2::uuid, $3, $4
      WHERE EXISTS (SELECT 1 FROM day_sheet_access_grants g
        WHERE g.user_id = $1::uuid AND g.entity_id = $2::uuid AND g.revoked_at IS NULL
          AND (g.expires_at IS NULL OR g.expires_at > NOW()))
        AND EXISTS (SELECT 1 FROM artist_agent_relationships relationship
          WHERE relationship.agent_user_id = $1::uuid AND relationship.entity_id = $2::uuid
            AND relationship.status = 'active')
      ON CONFLICT (user_id, entity_id) DO UPDATE SET
        commission_percentage = EXCLUDED.commission_percentage,
        agency_name = CASE WHEN $5::boolean THEN EXCLUDED.agency_name ELSE collaborator_workspace_profiles.agency_name END,
        updated_at = NOW()
      RETURNING entity_id, commission_percentage, agency_name`,
    [req.userId, req.params.entityId, commissionPercentage, agencyName, agencyNameSupplied]);
    if (!result.rowCount) return res.status(403).json({ error: { message: 'Active booking-agent status is required to edit commission' } });
    res.json({ workspace: { id: result.rows[0].entity_id,
      commissionPercentage: Number(result.rows[0].commission_percentage), agencyName: result.rows[0].agency_name || '' } });
  });

  router.patch('/my-day-sheet-profile', async (req, res) => {
    const name = clean(req.body.name);
    const signedInEmail = email(req.headers['x-user-email']);
    if (!name || name.length > 120) return res.status(422).json({ error: { message: 'Enter your name (120 characters or fewer)' } });
    const user = await pool.query(`UPDATE users
      SET collaborator_profile_name=$1, collaborator_profile_confirmed_at=NOW(), updated_at=NOW()
      WHERE id=$2::uuid AND lower(email)=lower($3)
      RETURNING email, collaborator_profile_name name`,
      [name, req.userId, signedInEmail]);
    if (!user.rowCount) return res.status(403).json({ error: { message: 'Your collaborator identity could not be verified' } });
    res.json({ profile: { name: user.rows[0].name, email: user.rows[0].email,
      needsProfileConfirmation: false } });
  });

  return router;
}

module.exports = { createDaySheetCollaboratorRouter, territoryExclusivityApplies };
