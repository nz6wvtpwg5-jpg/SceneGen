# Promoter messaging release QA — 31 October 2026

## Release under test

- Commit `d7611b1`: new Messages centre, separated Inbox and Requests, workspace-scoped unread/read state.
- Render Web and API deploys both report `live` at this commit.
- Migration `075_promoter_message_read_status.sql` was confirmed applied in Render migration logs.

## Automated verification — PASS

- Two distinct simulated workspace identities (artist and promoter), plus an outsider identity, invoking the real outreach route handlers with an isolated stateful SQL stub.
- Default promoter opt-out; explicit opt-in; owner/admin-only requests; sender validation; one-request-per-pair; pending inbox and sent request; notification creation.
- Promoter-only acceptance; rejection of unauthorized acceptance; pending conversation inaccessible.
- Two-way accepted conversation messages; outsider cannot read, reply or mark conversation read.
- Sender/recipient unread counts, message retrieval and read acknowledgement; declined request cannot become a conversation or be re-sent.
- Existing API, privacy, UI wiring, rate-limit, shortlist and workspace regression suite: 80 tests passed.
- `pnpm typecheck`, `pnpm check:production` and `pnpm build` passed.
- Recent API Render log sample contains no promoter/messaging errors. A Web service historical lifecycle warning was recorded after a successful deployment, while the latest Web deploy remained reported live.

## Limitations — NOT YET VERIFIED

- A live production login with two separate controlled accounts, including a real opted-in promoter, could not be completed from the remote environment. Authenticated sign-in requests were restricted by the available tool.
- The remote environment's direct network request to the public SceneGen URL failed; absence of a 401/403 live smoke test is not evidence that authorization failed.
- SceneGen uses Neon for the application database; the Render read-only Postgres tool cannot verify its actual introduction rows or unread status.
- No automated browser walkthrough of authenticated desktop and mobile messaging screens was completed.

## Safe manual production test checklist

Use only dedicated test identities and workspaces. Never approach a real promoter or send messages to real users.

1. Promoter account: open Settings > Workspace; verify opt-in off. Turn it on.
2. Test artist account: discover that registered test promoter; send one introduction; verify duplicate attempt fails.
3. Promoter account: check Messages > Message requests and unread request count. Accept; ensure request moves to Inbox.
4. Artist account: check Sent requests and then Inbox. Open the accepted conversation; send a reply.
5. Promoter account: verify one unread conversation; open it, verify message and read-count clears; reply.
6. Artist account: verify one unread conversation; open it, verify reply and read-count clears.
7. Different third-party account: attempt GET/POST messages and read marker with the conversation ID; verify 404/403.
8. Separate test pair: decline a request; confirm messages and repeated introduction requests are blocked.
9. Test responsive desktop and mobile navigation and switching between band workspaces during an in-flight request.

**Release verification status:** Backend route flow passes simulation, production deploy and migration are live. Complete authenticated end-to-end production verification remains open.
