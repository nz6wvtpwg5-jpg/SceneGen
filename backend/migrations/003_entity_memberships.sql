CREATE TABLE IF NOT EXISTS entity_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_memberships_user
  ON entity_memberships(user_id, status);

CREATE INDEX IF NOT EXISTS idx_entity_memberships_entity
  ON entity_memberships(entity_id, status);
