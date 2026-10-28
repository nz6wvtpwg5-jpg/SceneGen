# SceneGen Patch 02 — Azure-free authentication

This patch replaces the earlier Azure JWT patch. Do **not** apply
`SceneGen_Patch_02_JWT_Entity_Authorization.zip`.

## Apply in VS Code

1. Apply SceneGen Patch 01 first and commit it.
2. Create a new branch:

   ```bash
   git switch -c feat/google-password-auth-02
   ```

3. Extract this ZIP into the repository root and overwrite matching files.
4. Remove the obsolete Azure-only module and test:

   ```bash
   git rm --ignore-unmatch backend/auth.js backend/test/auth.test.js
   ```

5. Refresh dependencies and run the authentication migration:

   ```bash
   corepack pnpm install
   cd backend
   npm install
   psql "$DATABASE_URL" -f migrations/002_auth.sql
   cd ..
   ```

6. Set these variables on the `scenegen-web` Render service:

   - `DATABASE_URL` (the same Neon database used by the backend)
   - `NEXTAUTH_URL=https://YOUR-SCENEGEN-DOMAIN`
   - `NEXTAUTH_SECRET` (Render generates this from the Blueprint)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `RESEND_API_KEY`
   - `AUTH_EMAIL_FROM=SceneGen <login@YOUR-VERIFIED-DOMAIN>`

7. In Google Cloud Console, create a Web OAuth client with this authorized
   redirect URI:

   ```text
   https://YOUR-SCENEGEN-DOMAIN/api/auth/callback/google
   ```

   Google sign-in uses only `openid email profile`. Calendar consent remains a
   separate action in SceneGen.

8. Verify locally:

   ```bash
   corepack pnpm typecheck
   corepack pnpm lint
   corepack pnpm build
   node --check backend/server.js
   git diff --check
   ```

## Test checklist

- Register with email/password and receive a verification email.
- Confirm login is rejected before email verification.
- Verify the email, then sign in.
- Request a password reset and use it once; confirm the same link cannot be
  reused.
- Sign in with Google and confirm the consent screen asks only for basic
  identity, not Calendar access.
- Connect Google Calendar separately from the Shows/Calendar screen.
- Confirm repeated incorrect passwords are throttled.

## Security decisions

- Passwords use Node's scrypt with a unique salt and OWASP-aligned work factor.
- Verification/reset tokens are random, expire, are single-use, and are stored
  only as SHA-256 hashes.
- Login responses do not reveal whether an email exists.
- Google accounts are linked only by Google's stable account ID or to an
  already-verified matching email. An unverified password account is never
  silently claimed by Google sign-in.
- Authentication database calls travel only between the Render web service and
  private backend and require `BACKEND_SERVICE_TOKEN`.

## Deliberate boundary

This patch replaces identity and login. A following authorization patch should
finish converting every legacy API proxy to derive the user ID and entity
membership exclusively from the server-side Auth.js session. Until then, keep
the Express service private as configured in Patch 01 and do not enable public
multi-user access.
