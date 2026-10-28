CREATE TABLE IF NOT EXISTS artist_agent_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'changes_requested', 'active', 'paused', 'ended', 'declined')),
  commission_percentage NUMERIC(5,2)
    CHECK (commission_percentage IS NULL OR commission_percentage BETWEEN 0 AND 100),
  profile_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  permission_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_note TEXT CHECK (decision_note IS NULL OR char_length(decision_note) <= 1000),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_agent_relationship_current
  ON artist_agent_relationships(entity_id, agent_user_id)
  WHERE status IN ('requested', 'changes_requested', 'active', 'paused');
CREATE INDEX IF NOT EXISTS idx_artist_agent_relationship_agent
  ON artist_agent_relationships(agent_user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_artist_agent_relationship_entity
  ON artist_agent_relationships(entity_id, status, updated_at DESC);

COMMENT ON TABLE artist_agent_relationships IS
  'Artist-approved professional representation. Operational access remains governed by day_sheet_access_grants.';
