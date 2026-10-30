# Promoter discovery: product and implementation plan

## Goal and guardrails
- Make promoter discovery useful immediately to a signed-in artist workspace, using its saved genre hashtags.
- Never reveal another workspace's private contact IDs, email, phone, notes, private organisation/name, exact address, or a path that could be used to retrieve them.
- Distinguish a verified public profile, evidenced historical bookings, and a community-supplied genre. Do not fabricate scores, ratings, verified relationships or contact buttons.
- Preserve signed workspace authorization on every action and prevent cross-workspace data exposure.
- Keep changes on GitHub main, with tests and deployment checks after each completed phase.

## Phase 1 — Discovery UX, navigation and ranking
- [x] Automatic hashtag discovery (already available)
- [x] Country-only selector and dependent city-filter clearing (already available)
- [x] Add clear result summaries and genre filters with reset to saved band genres
- [x] Make selection of sorting explicit (relevance, name/location, evidence)
- [x] Clarify the three evidence tiers and preserve accessible responsive cards
- [x] Add targeted tests for sorting, resets, and workspace changes (additional browser coverage required)

## Phase 2 — Saved discovery shortlist
- [x] Establish stable opaque signed public discovery identifiers (not private contact IDs)
- [x] Create a separate workspace-scoped shortlist with its own migration and authorized API
- [x] Add Save/Unsave and My shortlist on the discovery UI
- [x] Test signed middleware denies cross-workspace shortlist access using two isolated simulated users
- [ ] Live authenticated two-account verification of actual shortlist rows and actions

## Phase 3 — Map and touring relevance
- [x] Introduce approximate city-only map coordinates, resolved from public city labels; never use private contact coordinates
- [x] Offer list/map view using coarse city markers with accessible list alternative
- [x] Add upcoming-show city discovery from the active band’s shows; proximity radius is a separate future enhancement
- [x] Show at most one disclosed city per anonymous listing and require a shared selected genre, preventing city-only and guessed-hashtag enumeration
- [ ] Complete a structured privacy review of combined booking-history and location signals

## Phase 4 — Outreach and quality
- [ ] Messaging only for registered opt-in promoters, after authentication/permissions/rate-limit/anti-spam review
- [x] Suppress anonymous duplicates for verified promoter claims, using private emails only for server-side matching
- [x] Add per-user/workspace database-backed rate limits for promoter searches and shortlist saves
- [ ] Add broader multi-account duplicate management; never merge different private-email identities solely by similar location or genre
- [ ] Live browser QA using separate artist test accounts and production API visibility checks

## Release criteria
- No loss of the current matching functionality; TypeScript, targeted tests and deploy pass.
- Results and shortlist items never expose private-contact fields or other workspaces' private record IDs.
- Map and touring modes do not go live without safe geographic data and authorization coverage.
