# SceneGen Patch 07 - account recovery and abuse protection

Apply after Patches 01-06.

```bash
git switch -c fix/account-recovery-07
```

Extract the ZIP into the repository root and overwrite matching files.

```bash
cd backend
npm ci
npm test
node --check server.js
cd ..
corepack pnpm typecheck
corepack pnpm build
git diff --check
```

Deploy through Render. Patch 5 applies `005_auth_rate_limit_cleanup.sql`
automatically before the API starts.

## Changes

- Registration, forgotten-password, reset, and verification-resend operations
  now have database-backed IP/email throttling.
- Every public response remains generic and does not reveal whether an account
  exists or is verified.
- An unverified registration can be safely attempted again, replacing the
  unusable unverified password and issuing a fresh verification token.
- Email-provider failures no longer strand the request or expose account state;
  they are logged without tokens and the user can retry.
- The login screen links to a dedicated resend-verification page.
- Stale rate-limit records are occasionally removed, supported by an indexed
  timestamp column.

## Manual tests

1. Register, do not verify, register again, and confirm only the newest link
   works.
2. Use Resend Verification and confirm the response is identical for an
   unknown email.
3. Trigger each limit repeatedly and confirm it stops sending email while
   continuing to return the generic response.
4. Verify an account and confirm registration cannot overwrite its password.
5. Complete a password reset and confirm the link cannot be reused.
