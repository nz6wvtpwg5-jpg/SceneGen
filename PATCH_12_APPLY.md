# SceneGen Patch 12 — Auth.js browser-session cleanup

Apply after Patches 01–11.

```bash
git switch -c fix/auth-session-cleanup-12
```

Extract this ZIP into the repository root and overwrite matching files. Remove
the obsolete backup source files:

```bash
git rm --ignore-unmatch src/app/shows/page.tsx.gridwidth
git rm --ignore-unmatch src/app/shows/page.tsx.backup-rightrail-v1
git rm --ignore-unmatch src/app/shows/page.tsx.backup-before-compact-rail
git rm --ignore-unmatch src/app/shows/page.tsx.backup-before-rightrail
git rm --ignore-unmatch src/components/header/app-header.tsx.backup-before-compact
```

Run:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check:legacy
corepack pnpm check:production
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
cd backend
npm ci
npm test
cd ..
git diff --check
```

No Render environment changes are required. Test both Google and email/password
sign-in, then verify entities, shows, tours, contacts, imports, sharing, profile
uploads, and logout in a fresh private browser window.

## Changes

- Removes the fake `session-authenticated` access-token marker.
- Stops exposing an `access_token` field on the browser session.
- Removes browser-generated bearer headers from all same-origin API calls.
- Makes Auth.js's secure session cookie the sole browser credential.
- Keeps signed HMAC identity generation at the Next.js middleware boundary.
- Simplifies show, tour, import, sharing, upload, and modal interfaces that
  previously passed fake tokens through component props.
- Removes five stale source backups containing the retired Azure auth flow.
- Extends production checks to reject fake session tokens, browser bearer
  headers, and backup source artifacts.
