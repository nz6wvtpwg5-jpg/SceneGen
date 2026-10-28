# Show creation and shared form-control patch

Base: uploaded `d658aa11-8944-438f-ad07-46620f52093d.zip`, SceneGen Jon-Newstuff-32.

## Changes

1. An artist can choose **We’re promoting this show ourselves**. Show details become available without selecting/inviting a promoter. Venue contact details are optional on this path. Switching away from a prepared invitation clears it; self-promotion sends no invitation. Existing search/invite paths remain available. Promoter accounts still select an artist.
2. Missing contact details remain absent. The create API sends null instead of manufacturing a promoter name, email or phone. Calendar creation no longer supplies fake contact values either. No schema migration is needed.
3. Editable raw form controls receive a white default surface and readable text. Component-specific styling can still override those defaults. Disabled controls keep actual disabled semantics and a distinct appearance. Shared Input and Select components receive shrinkable width constraints; the shared Select's editable surface is white.
4. Date/time/datetime/month/week controls receive explicit sizing and WebKit internal-value constraints. Native picker behaviour is retained. Mobile temporal inputs use 16px text. Grid/flex children in the create flow can shrink, including ticket-price fields. No overflow is hidden to disguise a sizing problem.
5. Currency is now visible and required for every deal type, including Door Split. The submit button allows native validation to explain missing currency rather than remaining silently disabled. Date/time/contact labels are associated with their controls.

Self-promotion is a creation choice, represented by the absence of an external promoter. This patch does not add a new persistent show status or automatically share access with anyone.

## Project-wide audit

The source scan inspected 365 JSX form controls, including 30 literal temporal controls/usages plus dynamically typed fields. Relevant surfaces include show creation/editing, calendar events, tour creation, booking-agent proposals, map day sheets, external day sheets, import validation, flights, travel/accommodation, daily itinerary, advancing tasks, notices and merchandise date filters. Shared CSS covers the date/time variants across these surfaces.

Controls that combine required and disabled were reviewed in password reset, restricted external day sheets and proposal revisions. These are genuine restrictions, rather than editable fields with misleading disabled styling, and were preserved. This was a source audit across the project, not a claim that every screen and every role was exercised in a live session.

## Validation

- TypeScript `tsc --noEmit`: passed.
- Existing mobile-show/tour and show-location checks: 14 passed.
- Real create API handler with mocked backend: absent and supplied contacts passed.
- Real React create form and compiled project CSS in Chromium: 25 browser assertions passed. Widths: 320, 375, 390, 430, 768 and 1440 CSS pixels. Includes control/page overflow, white editable date field, self-promoted submission without contact details, invitation-to-self transition, Door Split currency, existing-promoter submission, promoter role, edit and calendar entry points.
- Chromium component screenshots inspected.
- WebKit browser downloaded, but launch was blocked by missing host system libraries; dependency installation was not permitted. The same test suite includes WebKit, but its checks have NOT passed here. Physical iPhone/WKWebView and Android device testing remain outstanding.
- Tests mock authentication, venue search, tours, hooks and HTTP. They send no real invitations and do not write to production. No full production build or live database test was run. Local Node was 24.19.0; use the repository's supported Node 20–22 for release validation.

## Apply in VS Code

From the repository root, with the patch downloaded there:

```sh
git apply --check SceneGen-Show-Creation-Unified.patch
git apply SceneGen-Show-Creation-Unified.patch
pnpm typecheck
node --test backend/test/mobile-show-tour-creation.test.js backend/test/mobile-shows-tours.test.js backend/test/show-location-integrity.test.js
```

If your branch has newer changes, adapt overlapping hunks to the current implementation rather than overwriting them. Keep the self-promotion submit gate and optional contact validation together. There are no migration changes and no new production dependencies.

For the runnable component/API browser suite, install test tools outside the project:

```sh
npm install --prefix /tmp/scenegen-ui-tests --ignore-scripts esbuild @playwright/test@1.58.2
/tmp/scenegen-ui-tests/node_modules/.bin/playwright install chromium webkit
SCENEGEN_TEST_TOOLS=/tmp/scenegen-ui-tests/node_modules node tests/show-creation/verify.cjs
```

The default test run requires BOTH engines; it fails rather than silently skipping a missing browser. `--api-only` runs the API payload checks. `SCENEGEN_TEST_ENGINE=chromium` or `webkit` deliberately restricts the run and must not be reported as both engines passing.

After deploying the web changes, verify in the iOS app and Android browser: choose self-promotion, leave all contacts blank, enter the normal required show details, save, reopen the show, and confirm there is no invented promoter or invitation. Check the native date/time pickers and horizontal scrolling in portrait and landscape, plus an existing-promoter invitation. The Capacitor configuration in this archive loads the hosted web app; this patch changes that shared web layer.
