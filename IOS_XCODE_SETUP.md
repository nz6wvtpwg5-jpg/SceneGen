# SceneGen for iPhone — Xcode setup

This project uses Capacitor 8 and displays the live SceneGen application from
`https://scenegen-web.onrender.com/app`. The Render service remains responsible for
Next.js rendering, API routes, authentication and database access.

## Requirements

- A Mac running macOS compatible with Xcode 26
- Xcode 26 or newer (Apple requires Xcode 26/iOS 26 SDK for current uploads)
- Node.js 22 and pnpm
- An Apple Developer Program membership for TestFlight/App Store distribution
- An iPhone running iOS 15 or newer, or an Xcode simulator

## Create the Xcode workspace

Run these commands from the SceneGen project directory:

```bash
corepack enable
pnpm install
pnpm ios:prepare
pnpm ios:open
```

The `ios/` Xcode project is already checked in. Do not run `ios:add` unless you
have deliberately deleted the native project and intend to regenerate it. After
future JavaScript/configuration changes, run:

```bash
pnpm ios:sync
pnpm ios:open
```

`pnpm ios:prepare` validates the native configuration, regenerates the committed
icon and splash assets, and synchronises Capacitor before Xcode is opened. Use it
for release builds. `pnpm ios:sync` is sufficient for ordinary web/config changes
that do not alter the source artwork.

The production native entry defaults to the Render URL above. To switch to the
custom domain after `scenegen.io` is serving the same application over HTTPS, run
the preparation step with an explicit build-time value:

```bash
SCENEGEN_NATIVE_SERVER_URL=https://scenegen.io/app pnpm ios:prepare
```

The configuration refuses HTTP URLs and URLs containing credentials, query
parameters or fragments. Do not point an archive at localhost or a preview host.

## Set signing in Xcode

1. Select the **App** project, then the **App** target.
2. Open **Signing & Capabilities**.
3. Enable **Automatically manage signing**.
4. Choose your Apple Developer team.
5. Keep the registered bundle identifier as `io.scenegen.app`. The Xcode target,
   Capacitor configuration and APNs topic must always use this exact value.
6. Keep version 1.0 and build 1 for the first upload. Increment the build number
   for every later TestFlight upload, even when the public version remains 1.0.
7. Set the deployment target to iOS 15.0 or later.

SceneGen is currently configured as an iPhone-only, portrait application. Do not
enable iPad support until the complete iPad layout has been tested.

## Permissions and privacy

This first build does not request camera, microphone, photo-library, contacts or
location permission from native iOS APIs, so do not add misleading usage strings.
The web app can open Google Maps for directions without native location access.
Capacitor's iOS packages include their required-reason privacy manifests. Review
the assembled privacy report in Xcode whenever plugins change, and declare
SceneGen's actual account and operational data use accurately in App Store Connect.

## Push notifications

Patch 4 adds opt-in iPhone alerts for SceneGen notifications. The app asks only
after the signed-in user taps **Enable notifications** under **Settings → Personal**.

1. In Apple Developer, create an APNs key and retain its `.p8` contents, Key ID,
   and the 10-character Team ID.
2. In Xcode, select the SceneGen target and add **Push Notifications** under
   **Signing & Capabilities**. Confirm the selected provisioning profile includes it.
3. Add these secrets to the backend Render service: `APNS_KEY_ID`,
   `APPLE_DEVELOPER_TEAM_ID`, `APNS_PRIVATE_KEY`, and
   `APNS_BUNDLE_ID=io.scenegen.app`.
4. Preserve the `.p8` line breaks in `APNS_PRIVATE_KEY`; escaped `\n` values are
   also accepted. Never add the key file to Git.
5. Run migration `047_native_push_devices.sql` before enabling delivery.
6. Test on a physical iPhone. The simulator is not the release acceptance test.

Development builds can set `NEXT_PUBLIC_APNS_ENVIRONMENT=sandbox`. TestFlight
and App Store builds must omit it or set it to `production`.

## Authentication

Use SceneGen email/password authentication in the iOS shell. Google OAuth is
intentionally hidden inside the app because Google does not support ordinary
OAuth login inside an embedded WKWebView. Google sign-in remains available on
the normal website.

Google Calendar connection must also be completed on the normal website. It is
disabled in the iOS shell until SceneGen has a system authentication-session
handoff that can safely return authorization to the embedded session.

Before App Store submission, add native **Sign in with Apple** and native Google
authentication together if social login is required. Do not submit a build that
offers Google as its only third-party login option.

## Run on an iPhone

1. Connect the iPhone to the Mac and trust the computer.
2. Select the iPhone in Xcode's device menu.
3. Press **Run**.
4. On first use, accept Developer Mode/device trust prompts if Xcode requests them.

The app requires internet access for its primary data. The existing SceneGen
offline road pack remains available after the relevant pages have been cached.

## Test offline road mode

1. Sign in while online and select the workspace you plan to use on the road.
2. Leave SceneGen open briefly so it can save up to 12 upcoming day sheets from
   the next 45 days.
3. Open an upcoming show once and confirm the page says it is available offline
   automatically.
4. Enable Airplane Mode, fully close the app, and reopen it.
5. Use **Open saved sheets** in the offline banner and open a saved day sheet.
6. Confirm the sheet is marked **Saved copy — not live**, displays its saved
   time, and exposes no editing controls.
7. Reconnect, return to the live show, and use **Refresh saved copy** to verify
   the timestamp advances.

Offline day sheets intentionally include core show, venue, schedule, contact,
notes, and permitted financial information. Attachments, travel records, and
offline editing are not included in this release.

## TestFlight checklist

Run the complete release gate before archiving:

```bash
pnpm release:check
```

Apply database migration `048_release_readiness.sql`, set
`NEXT_PUBLIC_APP_RELEASE` to the exact public version and build (for example,
`1.0.0-1`), and create the isolated reviewer workspace using the gated command in
`APP_STORE_SUBMISSION.md`. That document also contains the listing draft,
screenshot plan, App Privacy answers and the physical-iPhone acceptance suite.

- Confirm the production Render service is healthy before launching the app.
- Test account creation, email verification, password reset and sign-out.
- Test show/day-sheet editing on a real iPhone, not only the simulator.
- Test external links, Google Maps directions and downloadable documents.
- Replace development screenshots with iPhone screenshots from this build.
- Supply the public Privacy Policy and Terms links already on the landing page.
- Complete App Store privacy and age-rating questionnaires accurately, including
  account identifiers and any operational content stored by SceneGen.
- Use **Product → Archive**, then **Distribute App → App Store Connect → Upload**.

## Important limitation

This is a legitimate TestFlight/native-shell starting point, but a remote web
shell alone can face App Review's minimum-functionality scrutiny. Native push
notifications, calendar integration, offline downloads and native authentication
are sensible follow-up features before a public App Store launch.
