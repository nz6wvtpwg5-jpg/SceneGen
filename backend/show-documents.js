const express = require('express');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 10 * 1024 * 1024;
const CATEGORIES = new Set(['contract', 'rider', 'stage_plot', 'hotel_confirmation', 'travel_document', 'other']);
const TYPES = new Set([
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'image/jpeg', 'image/png', 'image/webp',
]);
const cleanText = (value, maximum) => value == null || value === '' ? null : String(value).trim().slice(0, maximum);
const requestBody = (req) => req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
const externalCanEdit = (req) => !req.isExternalDaySheetCollaborator || ['advance', 'full'].includes(req.daySheetPermissions?.editScope);
const canSee = (req, document) => !req.isExternalDaySheetCollaborator
  || (document.visible_to_collaborators
    && (document.permission_level !== 'financial' || req.daySheetPermissions?.financialAccess !== 'hidden'));
const canManage = (req) => !req.isExternalDaySheetCollaborator && ['owner', 'admin'].includes(req.entityRole);

function decodeFile(data) {
  if (typeof data !== 'string' || !data || data.length > Math.ceil(MAX_BYTES / 3) * 4) return null;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) return null;
  const content = Buffer.from(data, 'base64');
  if (!content.length || content.length > MAX_BYTES || content.toString('base64') !== data) return null;
  return content;
}

function fileMatchesType(content, mimeType) {
  if (!TYPES.has(mimeType)) return false;
  const starts = (...bytes) => bytes.every((byte, index) => content[index] === byte);
  if (mimeType === 'application/pdf') return content.subarray(0, 5).toString('ascii') === '%PDF-';
  if (mimeType === 'image/jpeg') return starts(0xff, 0xd8, 0xff);
  if (mimeType === 'image/png') return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mimeType === 'image/webp') return content.subarray(0, 4).toString('ascii') === 'RIFF'
    && content.subarray(8, 12).toString('ascii') === 'WEBP';
  if (mimeType === 'application/msword' || mimeType === 'application/vnd.ms-excel') {
    return starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
  }
  if (mimeType.includes('openxmlformats-officedocument')) {
    if (!starts(0x50, 0x4b, 0x03, 0x04)) return false;
    const archiveText = content.toString('latin1');
    const folder = mimeType.includes('wordprocessingml') ? 'word/' : 'xl/';
    return archiveText.includes('[Content_Types].xml') && archiveText.includes(folder);
  }
  if (mimeType === 'text/plain') {
    if (content.includes(0)) return false;
    const decoded = content.toString('utf8');
    return !decoded.includes('\uFFFD') && Buffer.from(decoded, 'utf8').equals(content);
  }
  return false;
}

function contentDisposition(fileName) {
  const cleaned = String(fileName || 'document').replace(/["\\\r\n\uD800-\uDFFF]/g, '_').slice(0, 255) || 'document';
  const fallback = cleaned.replace(/[^\x20-\x7E]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`;
}

function createShowDocumentsRouter(pool) {
  const router = express.Router();

  router.use('/shows/:id/documents', (req, res, next) => {
    if (!UUID.test(req.params.id)) return res.status(400).json({ error: { message: 'Invalid show ID' } });
    if (req.isExternalDaySheetCollaborator && ['band_member', 'crew_member'].includes(req.daySheetPermissions?.accessRole)) {
      return res.status(403).json({ error: { code: 'BAND_MEMBER_DOCUMENTS_FORBIDDEN', message: 'Documents are not available with band-member day-sheet access' } });
    }
    next();
  });

  router.get('/shows/:id/documents', async (req, res) => {
    const show = await pool.query('SELECT id,tour_id FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text', [req.params.id, req.entityId]);
    if (!show.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
    const result = await pool.query(`SELECT document.id,document.category,document.title,document.notes,document.file_name,
        document.mime_type,document.byte_size,document.visible_to_collaborators,document.permission_level,
        document.requires_acknowledgement,document.tour_id,document.show_id,document.created_at,document.uploaded_by,
        current_receipt.acknowledged_at,
        COALESCE((SELECT json_agg(json_build_object(
          'name',COALESCE(person.name,person.email),'email',person.email,'acknowledgedAt',receipt.acknowledged_at)
          ORDER BY receipt.acknowledged_at)
          FROM tour_document_receipts receipt JOIN users person ON person.id=receipt.user_id
          WHERE receipt.document_id=document.id),'[]') acknowledgements
      FROM tour_documents document
      LEFT JOIN tour_document_receipts current_receipt
        ON current_receipt.document_id=document.id AND current_receipt.user_id=$4::uuid
      WHERE document.entity_id::text=$1::text
        AND (document.show_id=$2::uuid OR ($3::uuid IS NOT NULL AND document.tour_id=$3::uuid))
      ORDER BY document.category,document.created_at DESC`, [req.entityId, req.params.id, show.rows[0].tour_id, req.userId]);
    const documents = result.rows.filter((document) => canSee(req, document)).map((document) => {
      const metadata = { ...document, scope: document.show_id ? 'show' : 'tour' };
      if (req.isExternalDaySheetCollaborator) delete metadata.uploaded_by;
      if (!canManage(req)) delete metadata.acknowledgements;
      return metadata;
    });
    res.json({
      documents,
      tourId: show.rows[0].tour_id || null,
      canUpload: externalCanEdit(req),
      canDelete: !req.isExternalDaySheetCollaborator && ['owner', 'admin'].includes(req.entityRole),
    });
  });

  router.post('/shows/:id/documents', async (req, res) => {
    if (!externalCanEdit(req)) return res.status(403).json({ error: { message: 'This invitation cannot upload documents' } });
    const body = requestBody(req);
    const category = CATEGORIES.has(body.category) ? body.category : null;
    const scope = body.scope === 'show' || body.scope === 'tour' ? body.scope : null;
    const permissionLevel = category === 'contract' || body.permissionLevel === 'financial' ? 'financial' : 'operations';
    const mimeType = String(body.mimeType || '').trim().toLowerCase();
    const content = decodeFile(body.data);
    const title = cleanText(body.title, 200);
    const fileName = cleanText(body.fileName, 255);
    if (!category || !scope || !content || !fileMatchesType(content, mimeType) || !title || !fileName) {
      return res.status(422).json({ error: { message: 'Choose a valid document, category and assignment' } });
    }
    if (req.isExternalDaySheetCollaborator && scope === 'tour') return res.status(403).json({ error: { message: 'External collaborators can only upload to this show' } });
    if (req.isExternalDaySheetCollaborator && permissionLevel === 'financial'
      && req.daySheetPermissions?.financialAccess !== 'edit') {
      return res.status(403).json({ error: { message: 'This invitation cannot upload financial documents' } });
    }
    const show = await pool.query('SELECT id,tour_id FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text', [req.params.id, req.entityId]);
    if (!show.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
    if (scope === 'tour' && !show.rows[0].tour_id) return res.status(422).json({ error: { message: 'This show is not assigned to a tour' } });
    const visible = req.isExternalDaySheetCollaborator ? true : body.visibleToCollaborators === true;
    const result = await pool.query(`INSERT INTO tour_documents
        (entity_id,tour_id,show_id,category,title,notes,file_name,mime_type,byte_size,content,
        visible_to_collaborators,permission_level,requires_acknowledgement,uploaded_by)
      SELECT show_record.entity_id,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::uuid
      FROM shows show_record WHERE show_record.id=$15::uuid AND show_record.entity_id::text=$1::text
      RETURNING id`, [req.entityId,
      scope === 'tour' ? show.rows[0].tour_id : null, scope === 'show' ? req.params.id : null,
      category, title, cleanText(body.notes, 2000), fileName, mimeType, content.length, content,
      visible, permissionLevel, !req.isExternalDaySheetCollaborator && body.requiresAcknowledgement === true,
      req.userId, req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
    res.status(201).json({ id: result.rows[0].id });
  });

  router.get('/shows/:id/documents/:documentId/content', async (req, res) => {
    if (!UUID.test(req.params.documentId)) return res.status(400).json({ error: { message: 'Invalid document ID' } });
    const show = await pool.query('SELECT id,tour_id FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text', [req.params.id, req.entityId]);
    if (!show.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
    const result = await pool.query(`SELECT document.* FROM tour_documents document
      WHERE document.id=$1::uuid AND document.entity_id::text=$2::text
        AND (document.show_id=$3::uuid OR ($4::uuid IS NOT NULL AND document.tour_id=$4::uuid)) LIMIT 1`,
    [req.params.documentId, req.entityId, req.params.id, show.rows[0].tour_id]);
    const document = result.rows[0];
    if (!document || !canSee(req, document)) return res.status(404).json({ error: { message: 'Document not found' } });
    res.set('Content-Type', document.mime_type);
    res.set('Content-Length', String(document.byte_size));
    res.set('Content-Disposition', contentDisposition(document.file_name));
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(document.content);
  });

  router.post('/shows/:id/documents/:documentId/acknowledge', async (req, res) => {
    if (!UUID.test(req.params.documentId)) return res.status(400).json({ error: { message: 'Invalid document ID' } });
    try {
      const show = await pool.query('SELECT id,tour_id FROM shows WHERE id=$1::uuid AND entity_id::text=$2::text', [req.params.id, req.entityId]);
      if (!show.rowCount) return res.status(404).json({ error: { message: 'Show not found' } });
      const result = await pool.query(`SELECT document.* FROM tour_documents document
        WHERE document.id=$1::uuid AND document.entity_id::text=$2::text
          AND document.requires_acknowledgement=TRUE
          AND (document.show_id=$3::uuid OR ($4::uuid IS NOT NULL AND document.tour_id=$4::uuid)) LIMIT 1`,
      [req.params.documentId, req.entityId, req.params.id, show.rows[0].tour_id]);
      const document = result.rows[0];
      if (!document || !canSee(req, document)) return res.status(404).json({ error: { message: 'Document not found' } });
      const receipt = await pool.query(`INSERT INTO tour_document_receipts(document_id,user_id,acknowledged_at)
        VALUES($1::uuid,$2::uuid,NOW()) ON CONFLICT(document_id,user_id)
        DO UPDATE SET acknowledged_at=tour_document_receipts.acknowledged_at
        RETURNING acknowledged_at`, [document.id, req.userId]);
      res.json({ acknowledged: true, acknowledgedAt: receipt.rows[0].acknowledged_at });
    } catch (error) {
      console.error('Unable to acknowledge document:', error);
      res.status(500).json({ error: { message: 'Unable to acknowledge document' } });
    }
  });

  router.delete('/shows/:id/documents/:documentId', async (req, res) => {
    if (!UUID.test(req.params.documentId)) return res.status(400).json({ error: { message: 'Invalid document ID' } });
    if (!canManage(req)) {
      return res.status(403).json({ error: { message: 'Administrator access is required' } });
    }
    const result = await pool.query(`DELETE FROM tour_documents document USING shows show_record
      WHERE document.id=$1::uuid AND show_record.id=$2::uuid AND show_record.entity_id::text=$3::text
        AND document.entity_id::text=show_record.entity_id::text
        AND (document.show_id=show_record.id OR document.tour_id=show_record.tour_id) RETURNING document.id`,
    [req.params.documentId, req.params.id, req.entityId]);
    if (!result.rowCount) return res.status(404).json({ error: { message: 'Document not found' } });
    res.status(204).end();
  });

  return router;
}

module.exports = { createShowDocumentsRouter, decodeFile, fileMatchesType, contentDisposition };
