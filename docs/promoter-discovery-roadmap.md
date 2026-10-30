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
- [ ] Establish stable opaque public discovery identifiers that cannot expose private contacts or be guessed to retrieve them
- [ ] Create a separate workspace-scoped shortlist with its own migration and authorized API
- [ ] Add Save/Unsave and My shortlist on the discovery UI
- [ ] Verify another workspace cannot read, modify, or infer shortlist items

## Phase 3 — Map and touring relevance
- [ ] Introduce privacy-appropriate coarse coordinates for publicly listed locations only; do not expose private precise contact coordinates
- [ ] Offer list/map view using approved public or coarse city markers with accessible list alternative
- [ ] Allow discovery around the band's upcoming show cities, reusing SceneGen tours/shows data
- [ ] Prevent coordinates or combined show data from de-anonymizing community-listed contacts

## Phase 4 — Outreach and quality
- [ ] Messaging only for registered opt-in promoters, after authentication/permissions/rate-limit/anti-spam review
- [ ] Dedupe community listings without exposing internal identity keys, and guard against re-identification through rare combinations of filters
- [ ] Live browser QA using separate artist test accounts and production API visibility checks

## Release criteria
- No loss of the current matching functionality; TypeScript, targeted tests and deploy pass.
- Results and shortlist items never expose private-contact fields or other workspaces' private record IDs.
- Map and touring modes do not go live without safe geographic data and authorization coverage.
