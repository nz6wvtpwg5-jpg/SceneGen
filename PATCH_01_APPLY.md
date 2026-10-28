# SceneGen Patch 01 - Render readiness and security containment

## Apply in VS Code

1. Open the current `SceneGenJD/scenegen` repository in VS Code.
2. Create a branch:

   ```bash
   git switch -c fix/render-readiness-security-01
   ```

3. Extract this patch ZIP into the repository root and allow it to overwrite
   matching files.
4. Remove files that must not remain in Git:

   ```bash
   git rm --ignore-unmatch backend/.env.backup backend/database.db backend/scenegen.db
   git rm --ignore-unmatch backend/server.js.backup backend/server.js.broken
   git rm --ignore-unmatch backend/services/squareService.js.backup backend.pid
   ```

5. Open `backend/bulk-geocode-shows.js`, remove its hard-coded PostgreSQL URL,
   and use `process.env.DATABASE_URL` instead.
6. Refresh the stale root lockfile:

   ```bash
   corepack enable
   pnpm install
   ```

7. Run the checks:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   node --check backend/server.js
   ```

8. Review and commit:

   ```bash
   git status
   git diff --check
   git add -A
   git commit -m "Prepare SceneGen for secure Render deployment"
   git push -u origin fix/render-readiness-security-01
   ```

Do not create the Render Blueprint until the rotated credentials are available.
The backend is configured as a paid private service deliberately; publishing
the current backend directly to the internet would expose routes whose full JWT
and membership authorization is scheduled for Patch 02.

## What this patch changes

- Adds a two-service Render Blueprint.
- Keeps Express on Render's private network.
- Adds frontend and backend health endpoints.
- Removes browser requests to `localhost:3001` from merchandise screens.
- Routes Square operations through authenticated Next.js server code.
- Adds internal authentication to admin and merchandise backend operations.
- Stops Azure token refresh secrets being written to logs.
- Adds safe environment templates and repository exclusions.
- Adds supported Node versions, type checking, and a current ESLint command.

## What this patch does not claim to solve

Backend JWT signature validation and entity membership authorization remain
Patch 02. Do not invite external users based on Patch 01 alone.
