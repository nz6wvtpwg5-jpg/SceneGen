ALTER TABLE calendar_connections
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT;

ALTER TABLE calendar_connections ALTER COLUMN access_token DROP NOT NULL;
ALTER TABLE calendar_connections ALTER COLUMN refresh_token DROP NOT NULL;

COMMENT ON COLUMN calendar_connections.access_token_encrypted IS 'AES-256-GCM encrypted Google access token';
COMMENT ON COLUMN calendar_connections.refresh_token_encrypted IS 'AES-256-GCM encrypted Google refresh token';
