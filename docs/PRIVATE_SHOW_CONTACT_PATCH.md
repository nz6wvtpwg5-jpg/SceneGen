# Private day-sheet contact capture

Apply this patch to the uploaded SceneGen -25 source (or review conflicts against newer code). Run `git apply --check PRIVATE_SHOW_CONTACT_CAPTURE.patch` before `git apply PRIVATE_SHOW_CONTACT_CAPTURE.patch` from the repository root.

Deploy migration 063 before restarting the patched backend:

```sh
cd backend
npm run migrate:deploy
```

The migration captures existing show contacts and installs a transactional trigger for future saves, imports and accepted proposals. It requires both a meaningful name and a valid-looking email. Each workspace has its own contact record; each show links that contact to the venue address, coordinates and the band's selected genre tags at capture time. Genre tags describe the associated band, not a promoter's declared preferences. No public discovery endpoint is added.

Removing contact details removes that show's association. Auto-captured contacts with no remaining shows disappear from the contacts list; existing manually created address-book entries remain. Deleting a show cascades its association. Editing a matching contact updates its name and phone; it never merges contacts across workspaces. Existing show-import contacts are marked as automatically captured.

Contacts responses include `showAssociations`, with show ID, venue/location and band genres. The existing contact-intelligence points include the same provenance. This patch does not redesign the Contacts UI. Restricted band/crew day-sheet access cannot use contact endpoints, including with a legacy viewer membership.

Validation performed: embedded PostgreSQL (PGlite) migration and data regression, authorization tests, contact-intelligence checks, JavaScript syntax and clean patch application. No production migration or browser testing performed.

To rerun the database test without changing application dependencies:

```sh
npm install --prefix /tmp/scenegen-contact-tests --ignore-scripts @electric-sql/pglite
PGLITE_MODULE=/tmp/scenegen-contact-tests/node_modules/@electric-sql/pglite node --test backend/test/private-show-capture.test.js backend/test/contact-intelligence.test.js backend/test/authorization.test.js
```

Without PGlite the database test is explicitly skipped. Do not treat that as a database pass. Before production deployment, back up the database and run the migration against a staging copy; the initial backfill touches existing shows and its duration depends on show count. Existing migration files are unchanged.
