ALTER TABLE day_sheet_access_grants
  ADD COLUMN IF NOT EXISTS source_invite_id UUID REFERENCES day_sheet_access_invites(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_day_sheet_grants_source_invite
  ON day_sheet_access_grants(source_invite_id)
  WHERE source_invite_id IS NOT NULL;

COMMENT ON COLUMN day_sheet_access_grants.source_invite_id IS
  'Invitation that created this grant, used to resolve stale invitation records after acceptance.';
