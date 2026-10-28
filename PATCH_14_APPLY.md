# SceneGen Patch 14 — Contacts and Notifications

Apply this patch after Patch 13 by copying the contents of this directory over the repository root.

## What changed

- Fixes the contact API/UI contract so accepted and pending contacts render correctly.
- Prevents request senders from accepting or rejecting their own requests.
- Validates the target profile and blocks requests to the active profile itself.
- Creates durable, entity-scoped notifications for contact requests, acceptances, and rejections.
- Adds an unread-count bell, notification history page, mark-one-read, and mark-all-read.
- Adds bounded notification queries and active-profile authorization through every proxy.
- Adds migration `009_contact_notifications.sql` and its regression test.

## Deploy

1. Copy all patch files over the repository root and commit them.
2. Push to the branch connected to Render.
3. The backend pre-deploy command must run `npm run migrate` (or `node migrate-deploy.js` from `backend`) before the new backend starts.
4. Deploy the backend first, then the web service.
5. Sign in, select a profile, send a contact request from another account, and verify the bell, notification page, accept/reject controls, and unread state.

## Verification completed

- Backend JavaScript syntax check passed.
- 23 backend tests passed.
- Legacy Azure/public configuration guard passed.
- Production-surface guard passed.

TypeScript could not be rerun in the packaging workspace because dependencies were not installed there; Render's normal build remains the final TypeScript/build gate.
