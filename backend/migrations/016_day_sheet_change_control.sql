ALTER TABLE day_sheet_access_invites
  ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE day_sheet_access_grants
  ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS day_sheet_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_external BOOLEAN NOT NULL DEFAULT FALSE,
  changes JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'applied', 'rejected', 'reverted')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(changes) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_day_sheet_changes_show_created
  ON day_sheet_changes(show_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_day_sheet_changes_entity_pending
  ON day_sheet_changes(entity_id, created_at DESC) WHERE status = 'pending';

COMMENT ON TABLE day_sheet_changes IS
  'Server-side audit trail and approval queue for day-sheet edits.';
