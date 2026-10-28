ALTER TABLE day_sheet_access_invites
  ADD COLUMN IF NOT EXISTS access_role TEXT NOT NULL DEFAULT 'collaborator'
    CHECK (access_role IN ('collaborator', 'band_member'));

ALTER TABLE day_sheet_access_grants
  ADD COLUMN IF NOT EXISTS access_role TEXT NOT NULL DEFAULT 'collaborator'
    CHECK (access_role IN ('collaborator', 'band_member'));

CREATE INDEX IF NOT EXISTS idx_day_sheet_grants_band_member
  ON day_sheet_access_grants(user_id, entity_id)
  WHERE revoked_at IS NULL AND access_role = 'band_member';

COMMENT ON COLUMN day_sheet_access_grants.access_role IS
  'band_member is a strictly read-only day-sheet surface: no commercial data, contacts, documents or professional-role upgrades.';
