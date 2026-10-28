# SceneGen Patch 13 - Persistent profiles and account settings

Apply after Patches 01-12.

## Validation

Run the repository's legacy, production-surface, typecheck, lint, build, and backend test checks after applying the migration. Render's backend pre-deploy command will apply migration 008; deploy the backend before testing the frontend.

## Test

1. Open Profile and edit the name, location, biography and genres.
2. Add video/music and social links plus several discography lines.
3. Refresh and confirm all changes remain.
4. Confirm upcoming shows are real future shows belonging to the entity.
5. View the profile through its profile URL and confirm demo content is gone.
6. Open Manage, update the account name, time zone and preferences, refresh, and confirm those changes remain.
7. Confirm a viewer membership cannot edit an entity profile.

## Changes

- Adds durable social links, discography, video and music fields to entities.
- Adds durable account preferences and time zone fields to users.
- Adds an entity-authorized profile editor with bounded, sanitized input.
- Replaces fake shows, releases, social URLs, video and audio with stored data.
- Returns real upcoming shows and stored assets from profile endpoints.
- Converts the empty Manage page into persistent account settings.
- Replaces the placeholder user GET/PUT implementation with database queries.
- Adds production guards against the removed demo profile content.
