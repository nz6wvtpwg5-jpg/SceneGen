# SceneGen iPhone release candidate

This is the handoff record for TestFlight and App Review. Recheck every answer
against the production build and current App Store Connect form before submission.

## Listing text

**Name:** SceneGen

**Subtitle:** Live touring operations

**Promotional text:** Keep shows, routes, day sheets, contacts, documents and
tour finances together—from first offer to show day.

**Description:**

SceneGen is a live-operations workspace for touring artists, booking agents and
promoters. Build tours, manage show information, advance production details and
share controlled day-sheet access without rebuilding the same information in
messages and spreadsheets.

Keep venue and contact information, schedules, routes, travel, accommodation,
documents, offers and budgets connected to the show they belong to. Permission
controls let external collaborators see or edit only the dates and information
assigned to them.

On iPhone, SceneGen provides opt-in operational notifications and automatically
prepares upcoming read-only road packs for weak-signal and offline use.

**Keywords:** touring,day sheet,tour manager,booking agent,concert,venue,road crew

**Support URL:** https://scenegen.io/

**Privacy URL:** https://scenegen.io/privacy

**Category:** Primary: Business. Secondary: Productivity.

## Screenshot set

Capture real production UI with the isolated App Review account. Do not use
mockups, invented shows, private customer data, notification banners, debug
overlays or transparent images. Supply five portrait screenshots at an accepted
6.9-inch size (prefer 1320 × 2868) in this order:

1. Dashboard — “The whole show. One working record.”
2. Tour overview and routing — “Every date, route and status together.”
3. Mobile day sheet — “Show-day detail built for the road.”
4. Offline road pack — “Schedules and documents when signal disappears.”
5. Collaborator access — “Share only what each person needs.”

Apple accepts one to ten screenshots. Current official dimensions are maintained
at https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/.
The project remains iPhone-only, so do not upload an iPad build or imply iPad support.

## App Privacy questionnaire draft

SceneGen declares no tracking and no third-party advertising. Data is linked to
the user's identity and used for app functionality, not tracking:

- Contact Info: name and email address.
- Identifiers: SceneGen user ID.
- User Content: show, tour, contact, message, document and operational content.
- Diagnostics: crash/error data; reports exclude form contents and are rate-limited.
- Financial Info: declare only if App Store Connect treats user-entered show fees,
  budgets and settlements as financial information for this product.

SceneGen does not request the iPhone's location, contacts, camera, microphone or
photo library in this release. Venue and contact locations are typed or selected
by the user. Re-answer the questionnaire before submission if analytics, SDKs or
native permissions change. Apple privacy management guidance:
https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/.

## Permission wording

The notification permission is requested only after the user taps **Enable
notifications**. SceneGen explains it first as: “Get day-sheet changes,
approvals and show offers when SceneGen is closed.” Do not add a location usage
description: this release does not request native location permission.

## App Review account

Create a dedicated, verified and isolated account without committing credentials:

```bash
cd backend
ALLOW_APP_REVIEW_SEED=true \
APP_REVIEW_EMAIL='review-address-you-control@example.com' \
APP_REVIEW_PASSWORD='unique-password-at-least-16-characters' \
npm run seed:app-review
```

Put the credentials in App Review Information. Keep the account active throughout
review and do not require email codes, Google sign-in or access to a real band's
workspace. Explain that the included “SceneGen Review Tour” is demonstration data.

## Review notes

SceneGen is a working touring-operations product, not a collection of web links.
The iPhone build adds universal links, opt-in APNs alerts, native status/keyboard
handling and bounded offline road packs with read-only show-day information.
Account deletion is at **Settings → Personal → Danger zone**.

Google login and Google Calendar connection are intentionally unavailable inside
the embedded iPhone flow; email/password authentication is provided. External
web pages open outside SceneGen. No purchases or subscriptions are sold in this build.

## TestFlight and physical-iPhone acceptance

- Run migration `048_release_readiness.sql` and deploy frontend/backend together.
- Set `NEXT_PUBLIC_APP_RELEASE` to the submitted version/build, for example `1.0.0-1`.
- Run `pnpm ios:prepare`, open Xcode, select Any iOS Device, Archive, Validate,
  then upload to App Store Connect.
- Confirm version/build, bundle ID, signing team, push entitlement, privacy
  manifest and `ITSAppUsesNonExemptEncryption=false` in the archive.
- Install from TestFlight on a physical iPhone using mobile data and Wi-Fi.
- Exercise registration, verification, login, workspace selection and sign-out.
- Create/edit a tour and show; verify tenant A cannot load tenant B IDs.
- Open invitation and password-reset universal links from Mail or Messages.
- Enable notifications deliberately; test foreground, background and tapped alerts.
- Prepare a road pack, enable Airplane Mode, force-quit, reopen, and inspect its
  saved read-only show information and stale-data warning.
- Restore connectivity and verify refresh replaces stale timestamps safely.
- Simulate backend unavailability and confirm timeout/retry UI rather than a hang.
- Trigger a controlled UI error and confirm a sanitised report is recorded.
- Delete the test user's account, confirm immediate sign-out, failed re-login,
  revoked workspace access and removal of local offline data.
- Check Dynamic Type, VoiceOver labels, keyboard focus, contrast and portrait layout.
- Review every screenshot and privacy answer against the exact uploaded build.
