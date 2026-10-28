-- Repair relationships left active by the older day-sheet-only removal path.
-- The account and relationships with other artists remain untouched.
UPDATE artist_agent_relationships relationship
SET status='ended', ended_at=COALESCE(ended_at,NOW()), updated_at=NOW(),
    decision_note=COALESCE(decision_note,'Closed automatically because this artist no longer grants access')
WHERE relationship.status IN ('requested','changes_requested','approved','active','paused')
  AND NOT EXISTS (
    SELECT 1 FROM day_sheet_access_grants grant_record
    WHERE grant_record.entity_id=relationship.entity_id
      AND grant_record.user_id=relationship.agent_user_id
      AND grant_record.revoked_at IS NULL
      AND (grant_record.expires_at IS NULL OR grant_record.expires_at>NOW())
  );
