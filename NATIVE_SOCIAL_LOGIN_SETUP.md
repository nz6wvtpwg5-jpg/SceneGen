# Native Google and Apple sign-in setup

The codebase supports native Google and Apple authentication in the Capacitor iOS app. Email/password remains available as a fallback. Identity tokens are verified by the Next.js server before the backend links an account.

## Google Cloud

1. Create an iOS OAuth client for bundle ID `io.scenegen.app`.
2. Keep the existing Web OAuth client used by NextAuth.
3. Set these variables in the Next.js/Render service:
   - `GOOGLE_CLIENT_ID`: existing Web client ID
   - `GOOGLE_CLIENT_SECRET`: existing Web client secret
   - `GOOGLE_IOS_CLIENT_ID`: iOS client ID
   - `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`: the same Web client ID
   - `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID`: the iOS client ID
4. In Xcode, add a user-defined build setting named `GOOGLE_REVERSED_CLIENT_ID`. Set it to the reversed iOS client ID shown by Google, for example `com.googleusercontent.apps.123...`.

## Apple Developer

1. Enable **Sign in with Apple** on the `io.scenegen.app` App ID.
2. In Xcode, confirm the App target has the **Sign in with Apple** capability.
3. Set these variables in the Next.js/Render service:
   - `APPLE_IOS_CLIENT_ID=io.scenegen.app`
   - `NEXT_PUBLIC_APPLE_CLIENT_ID=io.scenegen.app`

Native Apple authentication does not require an Apple private key in this implementation because the app supplies an Apple identity token and SceneGen verifies it against Apple's public JWKS. A private key is needed only for web authorization-code exchange or token revocation workflows.

## Install and synchronize

```bash
pnpm install
pnpm typecheck
pnpm ios:sync
pnpm ios:open
```

After `ios:sync`, confirm `@capgo/capacitor-social-login` appears in `ios/App/CapApp-SPM/Package.swift`. Test both providers on a real device as well as the simulator. Sign in with Apple may require a paid Apple Developer team and a correctly signed build.

## Account linking

SceneGen links a verified social identity to an existing user only when that user's email is already verified. Otherwise it refuses the link. New social users are created with a verified email, and provider subject IDs are stored in `auth_accounts`.
