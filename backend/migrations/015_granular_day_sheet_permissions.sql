ALTER TABLE day_sheet_access_invites
  ADD COLUMN IF NOT EXISTS edit_scope TEXT NOT NULL DEFAULT 'full'
    CHECK (edit_scope IN ('none', 'advance', 'full')),
  ADD COLUMN IF NOT EXISTS financial_access TEXT NOT NULL DEFAULT 'hidden'
    CHECK (financial_access IN ('hidden', 'view', 'edit'));

ALTER TABLE day_sheet_access_grants
  ADD COLUMN IF NOT EXISTS edit_scope TEXT NOT NULL DEFAULT 'full'
    CHECK (edit_scope IN ('none', 'advance', 'full')),
  ADD COLUMN IF NOT EXISTS financial_access TEXT NOT NULL DEFAULT 'hidden'
    CHECK (financial_access IN ('hidden', 'view', 'edit')),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN day_sheet_access_grants.edit_scope IS
  'none=view only, advance=operational advance fields, full=all non-financial day-sheet fields';
COMMENT ON COLUMN day_sheet_access_grants.financial_access IS
  'hidden=financial values omitted, view=read only, edit=read and update';
