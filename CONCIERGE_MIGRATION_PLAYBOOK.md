# SceneGen concierge migration playbook

This is the operator checklist for moving an existing tour into a customer's workspace. It uses the same preview, confirmation and tenant controls as a self-service import; support staff must never write directly to `shows`.

## Accepted sources

- Master Tour CSV exports
- CSV, TSV and XLSX spreadsheets with arbitrary headings
- pasted email or plain text
- DOCX and text-based PDF schedules
- PNG, JPG or WebP screenshots and scans

Files are limited to 10 MB and 500 extracted rows. Split larger migrations into named batches. OCR is an aid, not an authority: the customer or operator must check every extracted date, city and venue in the preview.

## Procedure

1. Obtain the file from an authorised workspace owner and agree how it should be handled after migration.
2. Sign in as the invited migration operator or work with the owner over screen sharing. Never borrow or request their password.
3. Open **Import**, upload the source and inspect the detected Master Tour badge if applicable.
4. Map Show date and City/town, then explicitly classify any money columns. Leave uncertain columns as **Do not import**.
5. Confirm each city, the tour currency and the complete import summary.
6. Review duplicate matches. Keep **Skip existing dates** unless the owner explicitly confirms that two shows really occur in the same city on the same day.
7. Save once and record the resulting tour. Each committed batch is logged in `import_batches` with its source fingerprint, creator, count and skipped duplicates.
8. Query `GET /api/import/history` while signed into the owner account when reconciling support cases. The endpoint is workspace-owner-only and returns no uploaded source contents.

## Safety and rollback

Imports are transactional: a failed batch saves nothing. The import never overwrites an existing show. For a mistaken successful batch, inspect its logged timestamp and fingerprint, verify the exact tour in the UI, then use the existing owner-only tour deletion workflow. Never delete by filename or approximate date alone.
