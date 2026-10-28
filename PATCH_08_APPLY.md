# SceneGen Patch 08 — Render API proxy cleanup

Apply after Patches 01–07.

```bash
git switch -c fix/render-api-proxies-08
```

Extract the ZIP into the repository root and overwrite matching files. Remove
the obsolete hard-coded development endpoint:

```bash
git rm --ignore-unmatch src/app/api/admin/fix-tour-budgets/route.ts
```

Run:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check:legacy
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
cd backend
npm ci
npm test
cd ..
git diff --check
```

## Changes

- Every affected Next.js API proxy now resolves the backend through the shared
  server-only `getBackendUrl()` helper.
- Browser-exposed `NEXT_PUBLIC_BACKEND_URL` and `NEXT_PUBLIC_API_URL` are removed
  from server routes.
- Obsolete Azure API Management subscription headers and variables are removed.
- The Calendar sync database update now uses the private Render API address and
  forwards the signed server identity.
- The unauthenticated, hard-coded tour-budget repair instructions are removed.
- Production builds now fail if legacy Azure/public-backend configuration is
  reintroduced under `src/app/api`.

The local fallback remains `http://localhost:3001`, but only inside the shared
server-side backend helper. It is never shipped as a browser backend address.
