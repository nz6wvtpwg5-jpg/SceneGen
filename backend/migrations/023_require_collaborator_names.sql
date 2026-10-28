-- Active legacy records must remain usable when name requirements are enforced.
-- Historical revoked rows remain unchanged for auditability.
UPDATE day_sheet_access_invites
SET recipient_name = split_part(email, '@', 1)
WHERE status IN ('pending', 'accepted')
  AND revoked_at IS NULL
  AND NULLIF(trim(recipient_name), '') IS NULL;

UPDATE day_sheet_access_grants grant_record
SET recipient_name = COALESCE(NULLIF(trim(app_user.name), ''), split_part(app_user.email, '@', 1))
FROM users app_user
WHERE app_user.id = grant_record.user_id
  AND grant_record.revoked_at IS NULL
  AND NULLIF(trim(grant_record.recipient_name), '') IS NULL;

-- NOT VALID preserves historical rows but enforces the rule for all future
-- inserts and updates, including invitation acceptance.
ALTER TABLE day_sheet_access_invites
  ADD CONSTRAINT day_sheet_invites_recipient_name_required
  CHECK (recipient_name IS NOT NULL AND trim(recipient_name) <> '') NOT VALID;

ALTER TABLE day_sheet_access_grants
  ADD CONSTRAINT day_sheet_grants_recipient_name_required
  CHECK (recipient_name IS NOT NULL AND trim(recipient_name) <> '') NOT VALID;
