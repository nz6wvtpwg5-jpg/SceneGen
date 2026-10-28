ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS client_error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  error_name VARCHAR(120),
  message VARCHAR(500) NOT NULL,
  stack TEXT,
  route VARCHAR(500),
  release VARCHAR(80),
  request_id VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_error_reports_created
  ON client_error_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_error_reports_entity_created
  ON client_error_reports (entity_id, created_at DESC);

COMMENT ON COLUMN users.deleted_at IS
  'Account is inaccessible and personal identifiers have been irreversibly scrubbed.';
