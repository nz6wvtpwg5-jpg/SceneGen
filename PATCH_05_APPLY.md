# SceneGen Patch 05 - automated versioned migrations

Apply after Patches 01-04.

```bash
git switch -c fix/render-migrations-05
```

Extract the ZIP into the repository root and overwrite matching files.

## Local verification

```bash
cd backend
npm ci
npm test
node --check migrate-deploy.js
npm run migrate
cd ..
git diff --check
```

`npm run migrate` requires `DATABASE_URL`. Run it against a development or
staging database first. Take a Neon backup before the first production run.

## Deployment behavior

The private API uses `preDeployCommand: npm run migrate`. The deployment
platform runs this after the build and before starting the new service version.
If a migration fails, the new version does not start.

The migration runner:

- discovers only files named like `002_name.sql`;
- applies them in filename order;
- records each successful migration in `schema_migrations`;
- wraps every migration in its own transaction;
- takes a PostgreSQL advisory lock to prevent concurrent deploys racing;
- refuses to continue if an already-applied migration's checksum changes;
- safely adopts existing databases because migrations 002 and 003 are
  idempotent.

Do not edit a numbered migration after production has applied it. Add a new
numbered SQL file instead.
