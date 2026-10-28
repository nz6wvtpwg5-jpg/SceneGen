CREATE TABLE IF NOT EXISTS collaborator_workspace_profiles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  commission_percentage NUMERIC(5,2),
  agency_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, entity_id),
  CHECK (commission_percentage IS NULL OR
    (commission_percentage >= 0 AND commission_percentage <= 100)),
  CHECK (agency_name IS NULL OR char_length(agency_name) <= 200)
);

INSERT INTO collaborator_workspace_profiles (user_id, entity_id, commission_percentage)
SELECT DISTINCT g.user_id, g.entity_id, u.collaborator_commission_percentage
FROM day_sheet_access_grants g
JOIN users u ON u.id = g.user_id
WHERE g.revoked_at IS NULL
ON CONFLICT (user_id, entity_id) DO NOTHING;

COMMENT ON TABLE collaborator_workspace_profiles IS
  'Private collaborator preferences scoped to one band workspace. Rows never confer workspace access.';
