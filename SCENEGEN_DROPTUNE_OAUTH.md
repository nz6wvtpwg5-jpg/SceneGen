# SceneGen -> Droptune OAuth setup

SceneGen is the authorization server. Droptune is one confidential OAuth client. Every connection is separately approved for one artist workspace and grants only `shows.read`.

## SceneGen API environment

Configure these values on the `scenegen-api` service:

```text
SCENEGEN_OAUTH_DROPTUNE_CLIENT_ID=droptune-production
SCENEGEN_OAUTH_DROPTUNE_CLIENT_SECRET=<at least 32 cryptographically random characters>
SCENEGEN_OAUTH_DROPTUNE_REDIRECT_URIS=https://droptune.io/api/integrations/scenegen/callback
```

Generate the shared secret with `openssl rand -base64 48`. Store the same client ID and secret in Droptune's server environment. Never expose the client secret through a browser variable.

For local development, add the exact local Droptune callback as another comma-separated URI. Redirect URIs are exact matches; wildcards are deliberately rejected.

## Endpoints

- Authorization: `https://scenegen.io/oauth/authorize`
- Token exchange and refresh: the SceneGen API `/oauth/token`
- Revoke: the SceneGen API `/oauth/revoke`
- Selected artist: the SceneGen API `/oauth/v1/artist`
- Upcoming public shows: the SceneGen API `/oauth/v1/shows`

The authorization request must use authorization-code flow, `scope=shows.read`, a state value and PKCE with `code_challenge_method=S256`.

Only public calendar fields leave SceneGen. Financials, contacts, addresses, internal notes, travel, accommodation, day sheets and documents are excluded at SQL selection and response serialization.
