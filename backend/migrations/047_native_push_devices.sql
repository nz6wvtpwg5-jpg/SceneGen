CREATE TABLE IF NOT EXISTS native_push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios')),
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('production', 'sandbox')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_native_push_devices_recipient
  ON native_push_devices (user_id, entity_id) WHERE enabled = true;
