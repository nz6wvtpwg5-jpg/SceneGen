ALTER TABLE day_sheet_access_invites
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(120);

ALTER TABLE day_sheet_access_grants
  ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(120);

UPDATE day_sheet_access_grants grant_record
SET recipient_name = NULLIF(trim(app_user.name), '')
FROM users app_user
WHERE app_user.id = grant_record.user_id
  AND grant_record.recipient_name IS NULL;

COMMENT ON COLUMN day_sheet_access_invites.recipient_name IS
  'Workspace-scoped display name supplied for the invited collaborator.';
COMMENT ON COLUMN day_sheet_access_grants.recipient_name IS
  'Workspace-scoped display name for this collaborator grant.';
