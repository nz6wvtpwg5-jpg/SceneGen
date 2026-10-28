-- Repair databases where the historical migration ledger was reconciled while
-- the access-role columns themselves were still absent. Keep this independent
-- of migrations 060/061 so deploys converge safely from either schema state.
ALTER TABLE day_sheet_access_invites
  ADD COLUMN IF NOT EXISTS access_role TEXT NOT NULL DEFAULT 'collaborator';

ALTER TABLE day_sheet_access_grants
  ADD COLUMN IF NOT EXISTS access_role TEXT NOT NULL DEFAULT 'collaborator';

DO $$
DECLARE constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT conrelid::regclass table_name, conname
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN ('day_sheet_access_invites'::regclass, 'day_sheet_access_grants'::regclass)
      AND pg_get_constraintdef(oid) LIKE '%access_role%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', constraint_record.table_name, constraint_record.conname);
  END LOOP;
END $$;

ALTER TABLE day_sheet_access_invites
  ADD CONSTRAINT day_sheet_access_invites_access_role_check
  CHECK (access_role IN ('collaborator', 'band_member', 'crew_member')) NOT VALID;

ALTER TABLE day_sheet_access_grants
  ADD CONSTRAINT day_sheet_access_grants_access_role_check
  CHECK (access_role IN ('collaborator', 'band_member', 'crew_member')) NOT VALID;

ALTER TABLE day_sheet_access_invites
  VALIDATE CONSTRAINT day_sheet_access_invites_access_role_check;

ALTER TABLE day_sheet_access_grants
  VALIDATE CONSTRAINT day_sheet_access_grants_access_role_check;

CREATE INDEX IF NOT EXISTS idx_day_sheet_grants_restricted_team
  ON day_sheet_access_grants(user_id, entity_id, access_role)
  WHERE revoked_at IS NULL AND access_role IN ('band_member', 'crew_member');

COMMENT ON COLUMN day_sheet_access_grants.access_role IS
  'collaborator, band_member or crew_member; restricted team roles are read-only and hide commercial data.';
