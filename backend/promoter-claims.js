'use strict';
const crypto = require('node:crypto');
const express = require('express');
const { sendTransactionalEmail } = require('./email');
const { publicFrontendUrl } = require('./public-frontend-url');

const EMAIL = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{42,64}$/;
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const tokenHash = value => crypto.createHash('sha256').update(value).digest('hex');
const normalizeGenres = value => Array.isArray(value)
  ? [...new Set(value.slice(0,20).map(tag => String(tag||'').trim().toLowerCase())
      .filter(tag => /^#[a-z0-9][a-z0-9_-]{1,40}$/.test(tag)))].slice(0,12)
  : [];

// The show and band are taken from the existing, workspace-scoped association.
// Never accept names or venue details from an invitation form.
function cleanInvitationText(value, limit = 160) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function formatInvitationDate(value) {
  const date = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(date + 'T12:00:00Z');
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
    ? '' : new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(parsed);
}

function composePromoterInvitation(show) {
  const band = cleanInvitationText(show?.band_name, 140);
  if (!band || !show?.show_id) throw new Error('A recorded band and show are required for this invitation');
  const festival = cleanInvitationText(show.festival_name);
  const venue = cleanInvitationText(show.venue_name);
  const event = festival
    ? (venue && festival.toLowerCase() !== venue.toLowerCase() ? festival + ' at ' + venue : festival)
    : (venue || 'Live show');
  const location = [
    cleanInvitationText(show.city, 120),
    cleanInvitationText(show.country, 120),
  ].filter(Boolean).join(', ');
  const date = formatInvitationDate(show.show_date);
  // The show date is required by the show record, so refuse an invitation
  // rather than inventing a date or sending an ambiguous booking reference.
  if (!date) throw new Error('Cannot invite a promoter without a recorded show date');
  const showLines = [event, location, date].filter(Boolean).join('\n');
  return {
    subject: band + ' added you as a promoter on SceneGen',
    heading: band + ' has added you as a promoter',
    body: band + ' has added you to SceneGen as the promoter for their show:\n\n'
      + showLines + '\n\n'
      + 'Claim your promoter profile to choose your public name and music genres, discover bands that suit your events, and create and manage your own shows.\n\n'
      + "The band’s private booking details and contacts remain private. Your public name and selected genres only become visible to other bands if you claim your profile. "
      + 'If you do not recognise this show, you can ignore this invitation.',
  };
}

/** Idempotent, rate-limited, verified-email invitation. Call only after saving
 * an actual contact (or show which automatically captured that contact).
 * Deployment/migrations and existing contacts never send invitations. */
async function invitePromoterByEmail(pool,{email,sourceEntityId,sourceShowId=null,sendMail=sendTransactionalEmail}) {
  const address=normalizeEmail(email);
  if(!EMAIL.test(address) || address.length>254 || !UUID.test(String(sourceEntityId||'')))
    return {sent:false,reason:'not_eligible'};
  if(sourceShowId!=null && !UUID.test(String(sourceShowId)))
    return {sent:false,reason:'invalid_show'};
  // A private contact on its own is not enough: the invitation must identify
  // the actual show which links this promoter to the inviting band.
  const showResult=await pool.query(
    "SELECT e.name AS band_name,s.id AS show_id,s.date::text AS show_date, "+
      "s.festival_name,s.venue_name, "+
      "COALESCE(NULLIF(trim(s.city),''),NULLIF(trim(pcs.venue_location->>'city'),'')) AS city, "+
      "COALESCE(NULLIF(trim(s.country),''),NULLIF(trim(pcs.venue_location->>'country'),'')) AS country "+
    "FROM private_contacts pc "+
    "JOIN entities e ON e.id=pc.entity_id AND e.entity_type='artist' "+
    "JOIN private_contact_shows pcs ON pcs.contact_id=pc.id AND pcs.entity_id=pc.entity_id "+
    "JOIN shows s ON s.id=pcs.show_id AND s.entity_id::text=pc.entity_id::text "+
    "WHERE pc.entity_id=$1::uuid AND lower(trim(pc.email))=$2 "+
      "AND ($3::uuid IS NULL OR s.id=$3::uuid) "+
      "AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(pc.roles) r(role) "+
        "WHERE lower(trim(r.role))='promoter') "+
      "AND COALESCE(s.show_type,'show') NOT IN ('off_day','travel_day') "+
      "AND COALESCE(lower(trim(s.status)),'confirmed') NOT IN ('cancelled','canceled') "+
    "ORDER BY s.date DESC,s.id DESC LIMIT 1",
    [sourceEntityId,address,sourceShowId]);
  if(!showResult.rows[0]) return {sent:false,reason:'no_linked_show'};
  const details=composePromoterInvitation(showResult.rows[0]);
  const claimed=await pool.query("SELECT 1 FROM promoter_claims WHERE email=$1 LIMIT 1",[address]);
  if(claimed.rowCount) return {sent:false,reason:'claimed'};

  const token=crypto.randomBytes(32).toString('base64url'),hash=tokenHash(token);
  const invite=await pool.query(
    "INSERT INTO promoter_claim_invitations(email,token_hash,invited_by_entity_id,source_show_id,expires_at,last_sent_at) "+
    "VALUES($1,$2,$3::uuid,$4::uuid,NOW()+INTERVAL '14 days',NOW()) "+
    "ON CONFLICT(email) DO UPDATE SET token_hash=EXCLUDED.token_hash, "+
    "invited_by_entity_id=EXCLUDED.invited_by_entity_id,source_show_id=EXCLUDED.source_show_id, "+
    "expires_at=EXCLUDED.expires_at, "+
    "last_sent_at=EXCLUDED.last_sent_at WHERE promoter_claim_invitations.claimed_at IS NULL "+
    "AND (promoter_claim_invitations.last_sent_at IS NULL OR "+
    "promoter_claim_invitations.last_sent_at<NOW()-INTERVAL '7 days') RETURNING email",
    [address,hash,sourceEntityId,showResult.rows[0].show_id]);
  if(!invite.rowCount) return {sent:false,reason:'already_invited'};
  const url=new URL('/claim-promoter',publicFrontendUrl());
  url.searchParams.set('token',token);
  try {
    await sendMail({
      to:address,subject:details.subject,
      heading:details.heading,
      body:details.body,
      action:'Claim your profile',actionUrl:url.toString(),category:'promoter-claim',
    });
    return {sent:true};
  } catch(error) {
    await pool.query("UPDATE promoter_claim_invitations SET last_sent_at=NULL WHERE email=$1 AND token_hash=$2 AND claimed_at IS NULL",[address,hash]).catch(()=>{});
    console.error('Promoter claim email delivery failed',error instanceof Error ? error.message : 'Unknown error');
    return {sent:false,reason:'delivery_failed'};
  }
}
async function verifiedInvitation(db,userId,token) {
  if(!UUID.test(String(userId||''))||!TOKEN.test(String(token||''))) return null;
  const pending=await db.query(
    "SELECT email FROM promoter_claim_invitations WHERE token_hash=$1 "+
    "AND expires_at>NOW() AND claimed_at IS NULL",[tokenHash(token)]);
  if(!pending.rowCount) return null;
  const owner=await db.query(
    "SELECT email,email_verified_at FROM users WHERE id=$1::uuid AND deleted_at IS NULL LIMIT 1",[userId]);
  if(!owner.rows[0]?.email_verified_at ||
     normalizeEmail(owner.rows[0].email)!==normalizeEmail(pending.rows[0].email)) return null;
  return pending.rows[0];
}
function createPromoterClaimRouter(pool) {
  const router=express.Router();
  // These routes sit behind SceneGen's signed-session identity middleware.
  router.get('/promoter-claims/status',async(req,res)=>{
    if(!TOKEN.test(String(req.query.token||'')))return res.status(400).json({eligible:false});
    const db=await pool.connect();
    try {
      await db.query('BEGIN READ ONLY');
      const invite=await verifiedInvitation(db,req.userId,req.query.token);
      await db.query('ROLLBACK');
      res.set('Cache-Control','private, no-store');
      res.json({eligible:Boolean(invite)});
    }catch(error){await db.query('ROLLBACK').catch(()=>{});res.status(500).json({error:{message:'Could not check this invitation'}})}
    finally{db.release()}
  });
  router.post('/promoter-claims/claim',async(req,res)=>{
    const token=String(req.body?.token||'');
    const name=String(req.body?.name||'').trim().replace(/\s+/g,' ').slice(0,160);
    const tags=normalizeGenres(req.body?.genres);
    if(!TOKEN.test(token)||name.length<2)
      return res.status(422).json({error:{message:'A valid invitation and public promoter name are required'}});
    const db=await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[tokenHash(token)]);
      const invite=await verifiedInvitation(db,req.userId,token);
      if(!invite){await db.query('ROLLBACK');return res.status(403).json({error:{message:'Sign in with the invited, verified email account'}})}
      const prior=await db.query("SELECT 1 FROM promoter_claims WHERE email=$1 FOR UPDATE",[invite.email]);
      if(prior.rowCount){await db.query('ROLLBACK');return res.status(409).json({error:{message:'This promoter has already claimed their profile'}})}
      const owned=await db.query(
        "SELECT id FROM entities WHERE administrator_id=$1::text AND entity_type='promoter' "+
        "ORDER BY created_at LIMIT 1",[req.userId]);
      let promoterId=owned.rows[0]?.id;
      if(!promoterId) {
        const created=await db.query(
          "INSERT INTO entities(administrator_id,entity_type,name,tags) "+
          "VALUES($1::text,'promoter',$2,$3::jsonb) RETURNING id",[req.userId,name,JSON.stringify(tags)]);
        promoterId=created.rows[0].id;
      }else{
        await db.query("UPDATE entities SET name=$2,tags=$3::jsonb WHERE id=$1",[promoterId,name,JSON.stringify(tags)]);
      }
      await db.query(
        "INSERT INTO entity_memberships(entity_id,user_id,role,status) "+
        "VALUES($1::uuid,$2::uuid,'admin','active') "+
        "ON CONFLICT(entity_id,user_id) DO UPDATE SET role='admin',status='active',updated_at=NOW()",
        [promoterId,req.userId]);
      await db.query("INSERT INTO promoter_claims(email,entity_id,owner_user_id) VALUES($1,$2::uuid,$3::uuid)",
        [invite.email,promoterId,req.userId]);
      await db.query("UPDATE promoter_claim_invitations SET claimed_at=NOW(),promoter_entity_id=$2::uuid WHERE email=$1",
        [invite.email,promoterId]);
      await db.query('COMMIT');
      res.set('Cache-Control','private, no-store');
      return res.status(201).json({claimed:true,promoterId});
    }catch(error){
      await db.query('ROLLBACK').catch(()=>{});
      console.error('Promoter claim failed',error instanceof Error?error.message:'Unknown error');
      return res.status(500).json({error:{message:'Could not claim this profile right now'}});
    }finally{db.release()}
  });
  router.get('/promoter-network/artists',async(req,res)=>{
    try{
      if(!UUID.test(String(req.entityId||'')))return res.status(400).json({error:{message:'Select your promoter workspace'}});
      const own=await pool.query(
        "SELECT 1 FROM entities e LEFT JOIN entity_memberships em ON em.entity_id=e.id AND em.user_id=$2::uuid AND em.status='active' AND em.role IN ('admin','editor') WHERE e.id=$1::uuid AND e.entity_type='promoter' AND (e.administrator_id=$2::text OR em.user_id IS NOT NULL)",[req.entityId,req.userId]);
      if(!own.rowCount)return res.status(403).json({error:{message:'A promoter workspace is required'}});
      const q=String(req.query.q||'').trim().slice(0,80);
      if(q.length<2)return res.json({artists:[]});
      const result=await pool.query(
        "SELECT id::text AS id,name,city,country, "+
        "CASE WHEN jsonb_typeof(tags)='array' THEN tags ELSE '[]'::jsonb END AS tags "+
        "FROM entities WHERE entity_type='artist' AND "+
        "(name ILIKE '%'||$1||'%' OR tags::text ILIKE '%'||$1||'%') ORDER BY name LIMIT 30",[q]);
      res.set('Cache-Control','private, no-store');
      res.json({artists:result.rows});
    }catch(error){console.error('Promoter band search failed');res.status(500).json({error:{message:'Band search unavailable'}})}
  });
  return router;
}
module.exports={invitePromoterByEmail,composePromoterInvitation,formatInvitationDate,createPromoterClaimRouter,normalizeEmail,normalizeGenres,tokenHash};
