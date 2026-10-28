# SceneGen Patch 04 - object-level authorization

Apply after Patches 01-03.

```bash
git switch -c fix/object-authorization-04
```

Extract this ZIP into the repository root, overwrite matching files, then run:

```bash
cd backend
npm ci
npm test
node --check authorization.js
node --check server.js
cd ..
corepack pnpm typecheck
corepack pnpm build
git diff --check
```

## What this closes

Patch 03 checked entity membership whenever an entity ID was present. Patch 04
also protects requests that address a record directly:

- `/api/shows/:id` resolves `shows.entity_id`;
- `/api/tours/:id` resolves `tours.entity_id`;
- `/api/budgets/:id` resolves `budgets.entity_id`;
- list/create operations in those areas require an explicit entity context;
- nonexistent or context-free entity-owned resources are rejected before their
  handlers execute;
- resolved records still pass through role checks from Patch 03.

This prevents an authenticated user from omitting `X-Entity-Id` and attempting
to read or modify another account's records by guessing a UUID.
