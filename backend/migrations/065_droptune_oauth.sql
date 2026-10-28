CREATE TABLE IF NOT EXISTS oauth_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope = 'shows.read'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (client_id, user_id, entity_id)
);

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  code_hash CHAR(64) PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES oauth_integrations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope = 'shows.read'),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES oauth_integrations(id) ON DELETE CASCADE,
  access_token_hash CHAR(64) NOT NULL UNIQUE,
  refresh_token_hash CHAR(64) NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK (scope = 'shows.read'),
  access_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  UNIQUE (integration_id)
);

CREATE TABLE IF NOT EXISTS oauth_audit_log (
  id BIGSERIAL PRIMARY KEY,
  integration_id UUID REFERENCES oauth_integrations(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('authorized','token_issued','token_refreshed','revoked','shows_read')),
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS oauth_codes_expiry_idx ON oauth_authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS oauth_tokens_access_expiry_idx ON oauth_access_tokens(access_token_hash, access_expires_at);
CREATE INDEX IF NOT EXISTS oauth_tokens_refresh_expiry_idx ON oauth_access_tokens(refresh_token_hash, refresh_expires_at);
CREATE INDEX IF NOT EXISTS oauth_audit_integration_idx ON oauth_audit_log(integration_id, created_at DESC);

COMMENT ON TABLE oauth_integrations IS
  'Explicit artist-scoped grants for third-party integrations. No operational or financial scopes exist.';
COMMENT ON TABLE oauth_access_tokens IS
  'Only SHA-256 token digests are stored. Refresh tokens rotate on every use.';
