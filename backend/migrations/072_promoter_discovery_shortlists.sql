-- Workspace-owned shortlist of privacy-safe discovery snapshots, never private contacts.
CREATE TABLE IF NOT EXISTS promoter_discovery_shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  discovery_key TEXT NOT NULL CHECK(char_length(discovery_key) BETWEEN 20 AND 120),
  public_snapshot JSONB NOT NULL CHECK(jsonb_typeof(public_snapshot)='object'),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_id, discovery_key)
);
CREATE INDEX IF NOT EXISTS promoter_discovery_shortlists_entity ON promoter_discovery_shortlists(entity_id,created_at DESC);
