# SceneGen Patch 09 — Persistent secure messaging

Apply after Patches 01–08.

```bash
git switch -c fix/persistent-messaging-09
```

Extract this ZIP into the repository root and overwrite matching files. Remove
the retired Ably token endpoint and generated localhost conversation client:

```bash
git rm --ignore-unmatch src/app/api/route.ts
git rm -r --ignore-unmatch src/clients/conversation-client
```

Run:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
cd backend
npm ci
npm test
cd ..
git diff --check
```

Commit and push. Render's backend pre-deploy command will apply migration 006
before the new service version starts. Deploy the backend before (or together
with) the frontend.

After deployment, test with two accepted contacts:

1. Select the first entity and open Conversations.
2. Send a message to the accepted contact.
3. Refresh the page and confirm the message remains.
4. Sign in as the other contact, select its entity, and reply.
5. Confirm a pending or unrelated contact cannot read the conversation.

`ABLY_API_KEY` is no longer used and can be removed from Render after this
patch is successfully deployed.

## Changes

- Stores messages in PostgreSQL rather than ephemeral browser events.
- Uses an accepted contact record as the conversation boundary.
- Checks the signed user and active entity on every list, read, and send.
- Adds a 4,000-character limit and a chronological message index.
- Replaces the localhost-generated conversation client with Render proxies.
- Removes the unrestricted Ably token endpoint and unused Ably dependency.
- Refreshes open conversations every five seconds and persists sent messages.
