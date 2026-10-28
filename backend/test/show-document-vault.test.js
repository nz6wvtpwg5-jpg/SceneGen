const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('document vault migration is private, scoped, and legacy-entity compatible', () => {
  const sql = read('backend/migrations/032_tour_document_vault.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS tour_documents/);
  assert.match(sql, /entity_id VARCHAR\(255\) NOT NULL/);
  assert.match(sql, /CHECK \(num_nonnulls\(tour_id, show_id\) = 1\)/);
  assert.match(sql, /byte_size INTEGER NOT NULL CHECK \(byte_size BETWEEN 1 AND 10485760\)/);
  assert.match(sql, /visible_to_collaborators BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(sql, /permission_level TEXT NOT NULL DEFAULT 'operations'/);
  assert.match(sql, /content BYTEA NOT NULL/);
  assert.doesNotMatch(sql, /entity_id UUID NOT NULL REFERENCES entities/);
});

test('document acknowledgements are durable and tied to an exact uploaded record', () => {
  const sql = read('backend/migrations/035_document_acknowledgements.sql');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS requires_acknowledgement BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS tour_document_receipts/);
  assert.match(sql, /PRIMARY KEY \(document_id, user_id\)/);
  assert.match(sql, /acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/);
});

test('vault validates canonical base64 and real file signatures', () => {
  const { decodeFile, fileMatchesType } = require('../show-documents');
  const pdf = Buffer.from('%PDF-1.7\nexample');
  assert.deepEqual(decodeFile(pdf.toString('base64')), pdf);
  assert.equal(decodeFile(`${pdf.toString('base64')}\n`), null);
  assert.equal(fileMatchesType(pdf, 'application/pdf'), true);
  assert.equal(fileMatchesType(Buffer.from('not a pdf'), 'application/pdf'), false);
  assert.equal(fileMatchesType(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), 'image/png'), true);
  assert.equal(fileMatchesType(Buffer.from('plain text'), 'text/plain'), true);
  assert.equal(fileMatchesType(Buffer.from([0, 1, 2]), 'text/plain'), false);
});

test('document API enforces assignment and collaborator permissions', () => {
  const api = read('backend/show-documents.js');
  assert.match(api, /document\.visible_to_collaborators/);
  assert.match(api, /document\.permission_level !== 'financial'/);
  assert.match(api, /financialAccess !== 'hidden'/);
  assert.match(api, /category === 'contract'.*'financial'/);
  assert.match(api, /External collaborators can only upload to this show/);
  assert.match(api, /This invitation cannot upload financial documents/);
  assert.match(api, /\['owner', 'admin'\]\.includes\(req\.entityRole\)/);
  assert.match(api, /show_record\.entity_id::text=\$1::text/);
  assert.match(api, /delete metadata\.uploaded_by/);
  assert.match(api, /current_receipt\.acknowledged_at/);
  assert.match(api, /tour_document_receipts receipt JOIN users person/);
  assert.match(api, /requires_acknowledgement=TRUE/);
  assert.match(api, /DO UPDATE SET acknowledged_at=tour_document_receipts\.acknowledged_at/);
});

test('vault listings never expose bytes and downloads prevent sniffing or caching', () => {
  const api = read('backend/show-documents.js');
  assert.match(api, /SELECT document\.id,document\.category,document\.title/);
  assert.doesNotMatch(api, /SELECT document\.content,document\.id/);
  assert.match(api, /Cache-Control', 'private, no-store'/);
  assert.match(api, /X-Content-Type-Options', 'nosniff'/);
  assert.match(api, /filename\*=UTF-8''/);
});

test('content disposition removes header-breaking filename characters', () => {
  const { contentDisposition } = require('../show-documents');
  const header = contentDisposition('résumé\r\n".pdf');
  assert.doesNotMatch(header, /[\r\n]/);
  assert.match(header, /^attachment; filename="/);
  assert.match(header, /filename\*=UTF-8''/);
  assert.doesNotThrow(() => contentDisposition('\uD800.pdf'));
});

test('internal and isolated routes keep their identity and deletion boundaries', () => {
  const internal = read('src/app/api/shows/[id]/documents/route.ts');
  const external = read('src/app/api/collaborator/shows/[id]/documents/route.ts');
  const externalDownload = read('src/app/api/collaborator/shows/[id]/documents/[documentId]/content/route.ts');
  assert.match(internal, /daySheetProxy/);
  assert.match(external, /collaboratorIdentityHeaders/);
  assert.match(external, /Collaborator sign-in required/);
  assert.match(externalDownload, /documentDownloadProxy/);
});

test('internal and external day sheets share the permission-aware vault', () => {
  const component = read('src/components/shows/DocumentVault.tsx');
  const internal = read('src/app/shows/[id]/page.tsx');
  const external = read('src/app/external-day-sheets/[id]/page.tsx');
  assert.match(component, /Document vault/);
  assert.match(component, /Every show on this tour/);
  assert.match(component, /Share with permitted collaborators/);
  assert.match(component, /financialAccess !== 'edit'/);
  assert.match(component, /await confirmDialog/);
  assert.match(component, /Require acknowledgement/);
  assert.match(component, /I have read and understood this/);
  assert.match(component, /Acknowledged by/);
  assert.match(internal, /<DocumentVault/);
  assert.match(external, /financialAccess=\{permissions\.financialAccess\}/);
});

test('member and isolated collaborator acknowledgement routes preserve identity', () => {
  const authorization = read('backend/authorization.js');
  const internal = read('src/app/api/shows/[id]/documents/[documentId]/acknowledge/route.ts');
  const external = read('src/app/api/collaborator/shows/[id]/documents/[documentId]/acknowledge/route.ts');
  assert.ok(authorization.includes('\\/documents\\/'));
  assert.match(internal, /daySheetProxy/);
  assert.match(external, /collaboratorIdentityHeaders/);
  assert.match(external, /Collaborator sign-in required/);
});

test('document acknowledgement is idempotent and preserves the first receipt time', async (context) => {
  const express = require('express');
  const { createShowDocumentsRouter } = require('../show-documents');
  const firstTime = new Date('2026-08-30T12:00:00.000Z');
  let inserts = 0;
  const pool = { query: async (sql) => {
    if (sql.startsWith('SELECT id,tour_id FROM shows')) return { rowCount: 1, rows: [{ id: '11111111-1111-4111-8111-111111111111', tour_id: null }] };
    if (sql.includes('SELECT document.* FROM tour_documents')) return { rowCount: 1, rows: [{ id: '22222222-2222-4222-8222-222222222222', visible_to_collaborators: true, permission_level: 'operations' }] };
    if (sql.includes('INSERT INTO tour_document_receipts')) {
      inserts += 1;
      return { rowCount: 1, rows: [{ acknowledged_at: firstTime }] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  } };
  const app = express();
  app.use((req, _res, next) => { req.entityId = '33333333-3333-4333-8333-333333333333'; req.userId = '44444444-4444-4444-8444-444444444444'; req.entityRole = 'viewer'; next(); });
  app.use('/api', createShowDocumentsRouter(pool));
  const server = app.listen(0);
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/shows/11111111-1111-4111-8111-111111111111/documents/22222222-2222-4222-8222-222222222222/acknowledge`;

  const first = await (await fetch(url, { method: 'POST' })).json();
  const retry = await (await fetch(url, { method: 'POST' })).json();
  assert.equal(first.acknowledgedAt, firstTime.toISOString());
  assert.equal(retry.acknowledgedAt, firstTime.toISOString());
  assert.equal(inserts, 2);
});

test('document acknowledgement hides inaccessible records and creates no receipt', async (context) => {
  const express = require('express');
  const { createShowDocumentsRouter } = require('../show-documents');
  let receiptAttempted = false;
  const pool = { query: async (sql) => {
    if (sql.startsWith('SELECT id,tour_id FROM shows')) return { rowCount: 1, rows: [{ id: '11111111-1111-4111-8111-111111111111', tour_id: null }] };
    if (sql.includes('SELECT document.* FROM tour_documents')) return { rowCount: 1, rows: [{ id: '22222222-2222-4222-8222-222222222222', visible_to_collaborators: true, permission_level: 'financial' }] };
    if (sql.includes('tour_document_receipts')) receiptAttempted = true;
    return { rowCount: 0, rows: [] };
  } };
  const app = express();
  app.use((req, _res, next) => { req.entityId = '33333333-3333-4333-8333-333333333333'; req.userId = '44444444-4444-4444-8444-444444444444'; req.entityRole = 'viewer'; req.isExternalDaySheetCollaborator = true; req.daySheetPermissions = { financialAccess: 'hidden' }; next(); });
  app.use('/api', createShowDocumentsRouter(pool));
  const server = app.listen(0);
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/shows/11111111-1111-4111-8111-111111111111/documents/22222222-2222-4222-8222-222222222222/acknowledge`, { method: 'POST' });
  assert.equal(response.status, 404);
  assert.equal(receiptAttempted, false);
});
