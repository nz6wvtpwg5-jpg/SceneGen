-- An active accepted invitation is the authoritative record of access. Repair
-- rows produced by older acceptance flows where its linked grant was missing,
-- stale, revoked, or carried old permissions. Revoked and expired invitations
-- remain historical records and must not restore access.
WITH unique_users AS (
  SELECT lower(email) normalized_email, max(id::text)::uuid id
  FROM users
  GROUP BY lower(email)
  HAVING count(*) = 1
)
UPDATE day_sheet_access_invites invitation
SET accepted_by = app_user.id
FROM unique_users app_user
WHERE invitation.status = 'accepted'
  AND invitation.revoked_at IS NULL
  AND invitation.expires_at > NOW()
  AND invitation.accepted_by IS NULL
  AND app_user.normalized_email = lower(invitation.email);

INSERT INTO day_sheet_access_grants
  (entity_id, user_id, source_invite_id, recipient_name, access_level,
   edit_scope, financial_access, require_approval, scope_type, countries,
   tour_id, show_id, created_by, expires_at)
SELECT invitation.entity_id, invitation.accepted_by, invitation.id,
  COALESCE(NULLIF(trim(invitation.recipient_name), ''), NULLIF(trim(app_user.name), ''), split_part(invitation.email, '@', 1)),
  invitation.access_level, invitation.edit_scope, invitation.financial_access,
  invitation.require_approval, invitation.scope_type, invitation.countries,
  invitation.tour_id, invitation.show_id, invitation.created_by, invitation.expires_at
FROM day_sheet_access_invites invitation
JOIN users app_user ON app_user.id = invitation.accepted_by
  AND lower(app_user.email) = lower(invitation.email)
WHERE invitation.status = 'accepted'
  AND invitation.revoked_at IS NULL
  AND invitation.expires_at > NOW()
ON CONFLICT (source_invite_id) WHERE source_invite_id IS NOT NULL DO UPDATE SET
  entity_id = EXCLUDED.entity_id,
  user_id = EXCLUDED.user_id,
  recipient_name = EXCLUDED.recipient_name,
  access_level = EXCLUDED.access_level,
  edit_scope = EXCLUDED.edit_scope,
  financial_access = EXCLUDED.financial_access,
  require_approval = EXCLUDED.require_approval,
  scope_type = EXCLUDED.scope_type,
  countries = EXCLUDED.countries,
  tour_id = EXCLUDED.tour_id,
  show_id = EXCLUDED.show_id,
  created_by = EXCLUDED.created_by,
  expires_at = EXCLUDED.expires_at,
  revoked_at = NULL;

CREATE INDEX IF NOT EXISTS idx_day_sheet_invites_accepted_user_active
  ON day_sheet_access_invites(accepted_by, entity_id)
  WHERE status = 'accepted' AND revoked_at IS NULL;
