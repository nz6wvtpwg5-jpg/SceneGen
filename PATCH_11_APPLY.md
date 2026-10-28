# SceneGen Patch 11 — Persistent profile assets

Apply after Patches 01–10.

```bash
git switch -c fix/persistent-profile-assets-11
```

Extract the ZIP into the repository root and overwrite matching files, then run:

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

Commit and push. Render's backend pre-deploy migration command will apply
`007_persistent_assets.sql`. Deploy the backend before testing the web service.

Test with an artist and promoter profile:

1. Upload a press kit, stage plot, input list, and header image.
2. Refresh the profile and confirm each asset remains available.
3. Download each document and confirm its contents and filename are intact.
4. Confirm an unrelated account cannot open the asset URL.
5. Confirm an accepted contact can view the profile assets.
6. Confirm files larger than 10 MB and unsupported formats are rejected.

## Changes

- Replaces the nonfunctional URL-only asset placeholder with persistent files.
- Stores entity assets in PostgreSQL with a 10 MB database constraint.
- Adds authenticated, entity-aware downloads for owners, members, and accepted contacts.
- Adds the missing artist and promoter profile backend endpoints.
- Returns stored asset metadata with profile responses after refresh.
- Validates file identifiers, MIME types, size, and base64 integrity at both boundaries.
- Removes remaining Azure headers from profile pages.
- Expands the legacy-configuration guard to scan all application source.
