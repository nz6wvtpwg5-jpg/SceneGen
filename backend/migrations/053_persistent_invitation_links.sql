ALTER TABLE day_sheet_access_invites
  ADD COLUMN IF NOT EXISTS invite_token_encrypted TEXT;

COMMENT ON COLUMN day_sheet_access_invites.invite_token_encrypted IS
  'AES-GCM encrypted invitation token, available only to workspace administrators for copying and rotation.';
