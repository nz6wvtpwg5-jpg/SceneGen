ALTER TABLE day_sheet_access_invites
  ADD COLUMN IF NOT EXISTS invite_as_booking_agent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE day_sheet_access_invites
  ADD COLUMN IF NOT EXISTS booking_agent_commission NUMERIC(5,2)
    CHECK (booking_agent_commission IS NULL OR booking_agent_commission BETWEEN 0 AND 100);

COMMENT ON COLUMN day_sheet_access_invites.invite_as_booking_agent IS
  'True only when the artist directly invited this recipient to represent it. Acceptance creates an approved, band-scoped relationship.';

COMMENT ON COLUMN artist_agent_relationships.ended_at IS
  'Revocation boundary for one artist-agent relationship. Ended relationships must never be revived by a later day-sheet invitation.';
