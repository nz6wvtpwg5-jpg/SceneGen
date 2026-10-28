-- Accepted day-sheet invitations prove control of the invited email address.
-- Backfill verification so existing collaborators can set a portal password.
UPDATE users u
SET email_verified_at = COALESCE(i.accepted_at, NOW()), updated_at = NOW()
FROM day_sheet_access_invites i
JOIN day_sheet_access_grants g ON g.source_invite_id = i.id
WHERE g.user_id = u.id
  AND u.deleted_at IS NULL
  AND u.email_verified_at IS NULL
  AND i.status = 'accepted'
  AND i.accepted_by = u.id
  AND LOWER(i.email) = LOWER(u.email)
  AND i.revoked_at IS NULL
  AND g.revoked_at IS NULL;
