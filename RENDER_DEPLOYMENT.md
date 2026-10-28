# SceneGen Render deployment

This repository defines two Render services in `render.yaml`:

- `scenegen-web`: the public Next.js application.
- `scenegen-api`: a private Express service reachable only by other Render
  services in the same workspace.

## Deployment blockers

Do not deploy until all credentials previously committed in `.env.backup` and
backend scripts have been rotated. Removing a file does not invalidate its
contents or remove it from Git history.

Before the first deployment, run `pnpm install` at the repository root and
commit the resulting `pnpm-lock.yaml`. The supplied lockfile predates several
direct dependencies and a frozen Render build will correctly reject it.

## Repository cleanup

Run these commands from the repository root and commit the deletion:

```bash
git rm --ignore-unmatch backend/.env.backup backend/database.db backend/scenegen.db
git rm --ignore-unmatch backend/server.js.backup backend/server.js.broken
git rm --ignore-unmatch backend/services/squareService.js.backup backend.pid
find . -name .DS_Store -delete
find . -name __MACOSX -type d -prune -exec rm -rf {} +
```

Also remove the hard-coded database URL from
`backend/bulk-geocode-shows.js`, then clean it from Git history before sharing
the repository with additional collaborators.

## Create the services

1. In Render, choose **New > Blueprint**.
2. Connect `SceneGenJD/scenegen` and select `render.yaml`.
3. Enter every variable marked `sync: false`.
4. Generate one long random `BACKEND_SERVICE_TOKEN` and enter the identical
   value on both services.
5. Set `NEXTAUTH_URL` and `FRONTEND_URL` after Render assigns the web URL.
6. Deploy the private API, then the web service.

## Automatic deploys

Both services track `Jon/Newstuff` and deploy automatically after the repository's
GitHub Actions checks pass. This behavior is declared in `render.yaml` with
`autoDeployTrigger: checksPass`.

For services that already existed before this setting was added, open the Render
Blueprint once and choose **Sync Blueprint**. This applies the branch and
auto-deploy settings to both services. After that one-time sync, pushes to
`Jon/Newstuff` deploy automatically when the **Release validation** check passes.

Avoid **Manual Deploy > Deploy a specific commit** for routine releases because
Render disables automatic deploys when that dashboard action is used. If it is
used for a rollback, sync the Blueprint again afterward to restore auto-deploys.

The backend is deliberately a private service. Do not change it to a public web
service until Patch 2 implements cryptographic JWT validation and entity
membership authorization across every route.

## Required verification

Verify `/api/health`, login, onboarding, shows, tours, budgets, import, calendar
and merchandise flows. Confirm that a user cannot select or mutate an entity
they do not own before inviting external testers.
