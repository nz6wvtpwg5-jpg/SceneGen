# SceneGen Patch 06 — secure Google Calendar OAuth

Apply after Patches 01–05.

```bash
git switch -c fix/secure-calendar-oauth-06
```

Extract the ZIP into the repository root, overwrite matching files, then remove
the two obsolete callback routes:

```bash
git rm --ignore-unmatch src/app/api/auth/google/calendar/route.ts
git rm --ignore-unmatch src/app/api/auth/google/callback/route.ts
```

Generate an encryption key once:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set that exact value as `CALENDAR_TOKEN_ENCRYPTION_KEY` on the `scenegen-api`
Render service. Do not set it as a public variable and do not casually rotate
it: existing Calendar connections must be reconnected after a key change.

Set `GOOGLE_REDIRECT_URI` on `scenegen-web` to:

```text
https://YOUR-SCENEGEN-DOMAIN/api/calendar/callback
```

Add the same URI to the Google OAuth client's authorized redirect URIs.

Run:

```bash
cd backend
npm ci
npm test
node --check server.js
node --check calendar-crypto.js
cd ..
corepack pnpm typecheck
corepack pnpm build
git diff --check
```

Deploy through Render. Patch 5 automatically applies
`004_secure_calendar_tokens.sql` before the API starts.

## Result

- Google login continues to request identity scopes only.
- Calendar permission is requested only from Connect Calendar.
- OAuth state is signed, expires after ten minutes, is tied to the signed-in
  user, and must match a one-time HTTP-only nonce cookie.
- Google access and refresh tokens are encrypted with AES-256-GCM in Neon.
- Calendar API routes load tokens server-side; tokens are never returned to or
  stored in the browser.
- Token values and fragments are no longer logged.
- `POST /api/calendar/disconnect` deletes the stored connection.

Existing users must reconnect Google Calendar because old cookie-held tokens
are deliberately not imported.
