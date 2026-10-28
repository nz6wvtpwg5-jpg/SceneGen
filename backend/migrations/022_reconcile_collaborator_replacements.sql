-- Promote pending replacements only when they exactly match an active grant's
-- scope identity. Distinct country sets, tours, and shows remain independent.
DO $$
DECLARE
  replacement RECORD;
  target_grant UUID;
  previous_invite UUID;
BEGIN
  FOR replacement IN
    SELECT DISTINCT ON (invite.entity_id, app_user.id, invite.scope_type,
      invite.countries, invite.tour_id, invite.show_id)
      invite.*, app_user.id user_id
    FROM day_sheet_access_invites invite
    JOIN users app_user ON lower(app_user.email) = lower(invite.email)
    WHERE invite.status = 'pending' AND invite.revoked_at IS NULL AND invite.expires_at > NOW()
      AND EXISTS (
        SELECT 1 FROM day_sheet_access_grants grant_record
        WHERE grant_record.entity_id = invite.entity_id
          AND grant_record.user_id = app_user.id
          AND grant_record.revoked_at IS NULL
          AND (grant_record.expires_at IS NULL OR grant_record.expires_at > NOW())
          AND grant_record.scope_type = invite.scope_type
          AND (
            invite.scope_type = 'all'
            OR (invite.scope_type = 'countries' AND grant_record.countries @> invite.countries AND grant_record.countries <@ invite.countries)
            OR (invite.scope_type = 'tour' AND grant_record.tour_id = invite.tour_id)
            OR (invite.scope_type = 'show' AND grant_record.show_id = invite.show_id)
          )
      )
    ORDER BY invite.entity_id, app_user.id, invite.scope_type,
      invite.countries, invite.tour_id, invite.show_id, invite.created_at DESC, invite.id DESC
  LOOP
    SELECT grant_record.id, grant_record.source_invite_id
    INTO target_grant, previous_invite
    FROM day_sheet_access_grants grant_record
    WHERE grant_record.entity_id = replacement.entity_id
      AND grant_record.user_id = replacement.user_id
      AND grant_record.revoked_at IS NULL
      AND (grant_record.expires_at IS NULL OR grant_record.expires_at > NOW())
      AND grant_record.scope_type = replacement.scope_type
      AND (
        replacement.scope_type = 'all'
        OR (replacement.scope_type = 'countries' AND grant_record.countries @> replacement.countries AND grant_record.countries <@ replacement.countries)
        OR (replacement.scope_type = 'tour' AND grant_record.tour_id = replacement.tour_id)
        OR (replacement.scope_type = 'show' AND grant_record.show_id = replacement.show_id)
      )
    ORDER BY grant_record.created_at DESC, grant_record.id DESC
    LIMIT 1;

    UPDATE day_sheet_access_grants SET
      source_invite_id = replacement.id,
      recipient_name = replacement.recipient_name,
      access_level = replacement.access_level,
      edit_scope = replacement.edit_scope,
      financial_access = replacement.financial_access,
      require_approval = replacement.require_approval,
      created_by = replacement.created_by,
      expires_at = replacement.expires_at
    WHERE id = target_grant;

    UPDATE day_sheet_access_grants grant_record SET revoked_at = NOW()
    WHERE grant_record.entity_id = replacement.entity_id
      AND grant_record.user_id = replacement.user_id
      AND grant_record.id <> target_grant
      AND grant_record.revoked_at IS NULL
      AND grant_record.scope_type = replacement.scope_type
      AND (
        replacement.scope_type = 'all'
        OR (replacement.scope_type = 'countries' AND grant_record.countries @> replacement.countries AND grant_record.countries <@ replacement.countries)
        OR (replacement.scope_type = 'tour' AND grant_record.tour_id = replacement.tour_id)
        OR (replacement.scope_type = 'show' AND grant_record.show_id = replacement.show_id)
      );

    IF previous_invite IS NOT NULL AND previous_invite <> replacement.id THEN
      UPDATE day_sheet_access_invites SET status = 'revoked', revoked_at = NOW()
      WHERE id = previous_invite AND revoked_at IS NULL;
    END IF;

    UPDATE day_sheet_access_invites SET status = 'accepted', accepted_by = replacement.user_id,
      accepted_at = NOW(), revoked_at = NULL WHERE id = replacement.id;
  END LOOP;
END $$;
