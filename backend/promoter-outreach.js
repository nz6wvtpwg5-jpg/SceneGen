'use strict';
const express = require('express');
const {consumeDiscoveryAllowance} = require('./promoter-discovery-rate-limit');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = value => String(value || '').replace(/\r/g,'').trim();

function createPromoterOutreachRouter(pool, createEntityNotification=async()=>{}) {
  const router=express.Router();
  router.use((req,res,next)=>{
    if(!req.entityId || !['owner','admin'].includes(req.entityRole))
      return res.status(403).json({error:{message:'Only workspace owners and administrators can manage booking introductions'}});
    res.setHeader('Cache-Control','private, no-store');
    next();
  });
  router.get('/preferences',async(req,res)=>{
    try {
      const result=await pool.query(`SELECT e.entity_type, COALESCE(p.accepting_introductions,FALSE) enabled
        FROM entities e LEFT JOIN promoter_outreach_preferences p ON p.promoter_entity_id=e.id
        WHERE e.id=$1::uuid`,[req.entityId]);
      if(result.rows[0]?.entity_type!=='promoter') return res.status(403).json({error:{message:'A promoter workspace is required'}});
      res.json({acceptingIntroductions:result.rows[0].enabled===true});
    }catch(error){console.error('Promoter preference failed:',error.message);res.status(500).json({error:{message:'Unable to load preferences'}});}
  });
  router.put('/preferences',async(req,res)=>{
    try {
      if(typeof req.body?.acceptingIntroductions!=='boolean') return res.status(422).json({error:{message:'Choose whether to accept introductions'}});
      const result=await pool.query(`INSERT INTO promoter_outreach_preferences(promoter_entity_id,accepting_introductions)
        SELECT id,$2::boolean FROM entities WHERE id=$1::uuid AND entity_type='promoter'
        ON CONFLICT(promoter_entity_id) DO UPDATE SET accepting_introductions=EXCLUDED.accepting_introductions,updated_at=NOW()
        RETURNING accepting_introductions`,[req.entityId,req.body.acceptingIntroductions]);
      if(!result.rowCount) return res.status(403).json({error:{message:'A promoter workspace is required'}});
      res.json({acceptingIntroductions:result.rows[0].accepting_introductions});
    }catch(error){console.error('Promoter preference update failed:',error.message);res.status(500).json({error:{message:'Unable to update preferences'}});}
  });
  router.get('/inbox',async(req,res)=>{
    try {
      const result=await pool.query(`SELECT i.id,i.message,i.status,i.created_at,i.responded_at,
        artist.name artist_name,artist.id::text artist_id
        FROM promoter_introductions i
        JOIN entities artist ON artist.id=i.artist_entity_id
        WHERE i.promoter_entity_id=$1::uuid ORDER BY i.created_at DESC LIMIT 100`,[req.entityId]);
      const type=await pool.query('SELECT entity_type FROM entities WHERE id=$1::uuid',[req.entityId]);
      if(type.rows[0]?.entity_type!=='promoter') return res.status(403).json({error:{message:'A promoter workspace is required'}});
      res.json({requests:result.rows.map(row=>({id:row.id,message:row.message,status:row.status,
        artistName:row.artist_name,artistId:row.artist_id,createdAt:row.created_at,respondedAt:row.responded_at}))});
    }catch(error){console.error('Promoter inbox failed:',error.message);res.status(500).json({error:{message:'Unable to load introduction inbox'}});}
  });
  router.get('/sent',async(req,res)=>{
    try {
      const type=await pool.query('SELECT entity_type FROM entities WHERE id=$1::uuid',[req.entityId]);
      if(type.rows[0]?.entity_type!=='artist') return res.status(403).json({error:{message:'An artist workspace is required'}});
      const result=await pool.query(`SELECT i.id,i.message,i.status,i.created_at,i.responded_at,
        promoter.name promoter_name,promoter.id::text promoter_id
        FROM promoter_introductions i JOIN entities promoter ON promoter.id=i.promoter_entity_id
        WHERE i.artist_entity_id=$1::uuid ORDER BY i.created_at DESC LIMIT 100`,[req.entityId]);
      res.json({requests:result.rows.map(row=>({id:row.id,message:row.message,status:row.status,
        promoterName:row.promoter_name,promoterId:row.promoter_id,createdAt:row.created_at,respondedAt:row.responded_at}))});
    }catch(error){console.error('Promoter outgoing requests failed:',error.message);res.status(500).json({error:{message:'Unable to load sent introductions'}});}
  });
  router.post('/requests',async(req,res)=>{
    try {
      const promoterId=String(req.body?.promoterId || '');
      const message=clean(req.body?.message);
      if(!UUID.test(promoterId) || message.length<30 || message.length>1200 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(message))
        return res.status(422).json({error:{message:'Choose a registered promoter and enter a message of 30–1200 characters'}});
      const allowed=await pool.query(`SELECT artist.entity_type='artist' AS sender_valid,
        promoter.entity_type='promoter' AS recipient_valid,COALESCE(p.accepting_introductions,FALSE) AS opted_in
        FROM entities artist CROSS JOIN entities promoter
        LEFT JOIN promoter_outreach_preferences p ON p.promoter_entity_id=promoter.id
        WHERE artist.id=$1::uuid AND promoter.id=$2::uuid`,[req.entityId,promoterId]);
      const target=allowed.rows[0];
      if(!target?.sender_valid) return res.status(403).json({error:{message:'An artist workspace is required'}});
      if(!target.recipient_valid || !target.opted_in) return res.status(403).json({error:{message:'This promoter is not accepting introductions'}});
      if(!(await consumeDiscoveryAllowance(pool,{userId:req.userId,entityId:req.entityId,action:'outreach',maxAttempts:10,windowSeconds:86400}))) {
        res.setHeader('Retry-After','86400');
        return res.status(429).json({error:{message:'Daily introduction limit reached. Please try again tomorrow.'}});
      }
      // Prevent a declined contact from being repeatedly approached by the same artist.
      const prior=await pool.query(`SELECT status FROM promoter_introductions
        WHERE artist_entity_id=$1::uuid AND promoter_entity_id=$2::uuid
        ORDER BY created_at DESC LIMIT 1`,[req.entityId,promoterId]);
      if(prior.rows[0]?.status==='declined') return res.status(403).json({error:{message:'This promoter has declined introductions from your band'}});
      if(prior.rows[0]) return res.status(409).json({error:{message:'An introduction to this promoter has already been sent'}});
      const saved=await pool.query(`INSERT INTO promoter_introductions(artist_entity_id,promoter_entity_id,sent_by,message)
        SELECT $1::uuid,p.promoter_entity_id,$3::uuid,$4 FROM promoter_outreach_preferences p
        WHERE p.promoter_entity_id=$2::uuid AND p.accepting_introductions=TRUE
        ON CONFLICT DO NOTHING RETURNING id,status,created_at`,[req.entityId,promoterId,req.userId,message]);
      if(!saved.rowCount) return res.status(409).json({error:{message:'This introduction is not available or has already been sent'}});
      // In-app notification only: never email or reveal promoter contact details.
      try {
        const artist=await pool.query('SELECT name FROM entities WHERE id=$1::uuid',[req.entityId]);
        await createEntityNotification(promoterId,'promoter_introduction', 'New booking introduction',
          (artist.rows[0]?.name || 'A band')+' sent a booking introduction. Open Workspace settings to review.',
          '/settings?tab=workspace');
      } catch (notificationError) {console.error('Promoter intro notification failed:',notificationError.message);}
      res.status(201).json({id:saved.rows[0].id,status:saved.rows[0].status,createdAt:saved.rows[0].created_at});
    }catch(error){console.error('Promoter introduction failed:',error.message);res.status(500).json({error:{message:'Unable to send introduction'}});}
  });
  router.patch('/requests/:id',async(req,res)=>{
    try {
      if(!UUID.test(req.params.id) || !['accepted','declined'].includes(req.body?.status))
        return res.status(422).json({error:{message:'Choose accept or decline'}});
      const result=await pool.query(`UPDATE promoter_introductions SET status=$3,responded_at=NOW()
        WHERE id=$1::uuid AND promoter_entity_id=$2::uuid AND status='pending'
        RETURNING id,status,responded_at,artist_entity_id`,[req.params.id,req.entityId,req.body.status]);
      if(!result.rowCount) return res.status(404).json({error:{message:'Pending introduction not found in this promoter workspace'}});
      try {
        await createEntityNotification(result.rows[0].artist_entity_id,'promoter_introduction_response',
          'Promoter introduction update','A promoter has '+result.rows[0].status+' your booking introduction.',
          '/contacts/discover');
      } catch (notificationError) {console.error('Promoter response notification failed:',notificationError.message);}
      res.json({id:result.rows[0].id,status:result.rows[0].status,respondedAt:result.rows[0].responded_at});
    }catch(error){console.error('Promoter response failed:',error.message);res.status(500).json({error:{message:'Unable to respond to introduction'}});}
  });
  return router;
}
module.exports={createPromoterOutreachRouter};
