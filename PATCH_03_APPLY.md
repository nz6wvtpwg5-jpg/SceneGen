# SceneGen Patch 03 - trusted identity and entity authorization

Apply after Patches 01 and 02.

## Apply

```bash
git switch -c fix/trusted-identity-authorization-03
```

Extract this ZIP into the repository root and overwrite matching files, then:

```bash
cd backend
npm ci
npm test
node --check server.js
node --check authorization.js
cd ..
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
git diff --check
```

Commit only when every check passes.

## What changes

- The Next.js middleware discards caller-supplied identity and replaces it with
  an HMAC-signed user identity derived from the Auth.js session.
- The signing key is `BACKEND_SERVICE_TOKEN`; it remains server-side.
- Express verifies the signature and overwrites legacy `X-User-Id` values.
- Any supplied entity ID is checked against ownership or active membership.
- Viewers cannot mutate; only owners/admins can delete.
- Public invite and shared-show token lookups remain public and read-only.
- Authentication lifecycle endpoints remain private-service-token protected.

## Configuration

`BACKEND_SERVICE_TOKEN` must have the identical long random value on both
services. Never expose it as a `NEXT_PUBLIC_` variable.

## Manual abuse tests

1. Sign in as User A and record one entity ID belonging to User B.
2. Send User B's ID as `X-Entity-Id`; expect `403`.
3. Replace `X-User-Id` in the browser request; the server must still act as
   User A.
4. Call the private Express hostname directly; it must not be publicly
   reachable. A forged bearer value must return `401` from inside the network.
5. Confirm a viewer can read but cannot POST/PATCH/DELETE.
