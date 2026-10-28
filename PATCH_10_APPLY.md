# SceneGen Patch 10 — Production surface hardening

Apply after Patches 01–09.

```bash
git switch -c fix/production-surface-10
```

Extract this ZIP into the repository root and overwrite matching files. Remove
the development-only pages:

```bash
git rm --ignore-unmatch src/app/admin/fix-budgets/page.tsx
git rm --ignore-unmatch src/app/test-calendar/page.tsx
git rm --ignore-unmatch src/app/test-maps/page.tsx
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

In the Render web-service environment, add `GOOGLE_MAPS_API_KEY` using the same
restricted server key used by the backend. The existing
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` remains necessary for browser map rendering,
but the server-side distance route no longer uses it. Remove `ABLY_API_KEY` if
you have not already done so after Patch 09.

## Changes

- Removes hard-coded admin repair and public test pages.
- Removes authentication fragments, form contents, and tour-import payloads
  from production logs.
- Moves distance calculations to the server-only Google Maps key.
- Limits distance requests to 25 origins and destinations with bounded input.
- Adds a 10-second upstream timeout and stops returning Google's raw response.
- Adds a build-time guard that blocks development pages and sensitive logging.
- Removes the obsolete Ably variable from the Render Blueprint.
