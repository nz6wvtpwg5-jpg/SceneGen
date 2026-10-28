# SceneGen Patch 15 - Backend Consolidation

Apply this patch after Patch 14 by copying the directory contents over the repository root.

## What changed

- Standardizes contact creation, acceptance, rejection, listing, and deletion on `/api/contacts`.
- Retires duplicate `/api/connection/*` and `/api/contact/*` backend writes with an explicit `410 Gone` response.
- Adds the missing canonical `DELETE /api/contacts/:contactId` backend handler.
- Migrates contact search and embedded request controls to the canonical API.
- Requires an active, authorized profile context for contact removal.
- Normalizes contact data for the existing table and map components.
- Removes the misleading manual-contact form from the add-contact page; contacts now represent registered SceneGen profiles.
- Adds regression tests and a production guard against reintroducing legacy contact consumers.

## Deploy

1. Copy the patch files over the repository root and commit them.
2. Push to the branch connected to Render.
3. Deploy the backend first, then the web service.
4. Test search -> connect -> accept/reject -> delete using two accounts with separate profiles.

No database migration is required for Patch 15.

## Verification completed by the patch author

- Backend JavaScript syntax check passed.
- 25 backend tests passed.
- Legacy Azure/public configuration guard passed.
- Production-surface guard passed.

The packaging workspace does not contain installed frontend dependencies, so Render's build remains the TypeScript and production-build gate.
