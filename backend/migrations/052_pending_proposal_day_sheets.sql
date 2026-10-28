ALTER TABLE shows DROP CONSTRAINT IF EXISTS shows_status_check;
ALTER TABLE shows ADD CONSTRAINT shows_status_check
  CHECK (status IN ('confirmed', 'tentative', 'pending_acceptance', 'cancelled'));

ALTER TABLE show_proposals
  ADD COLUMN IF NOT EXISTS proposed_show_id UUID REFERENCES shows(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_show_proposals_proposed_show
  ON show_proposals(proposed_show_id) WHERE proposed_show_id IS NOT NULL;

UPDATE show_proposals SET proposed_show_id=accepted_show_id
WHERE proposed_show_id IS NULL AND accepted_show_id IS NOT NULL;

-- Proposal rights existed in the API but could not previously be selected in
-- the management interface. Existing active territory-wide permissions were
-- therefore all false unintentionally; align them with the visible rule.
UPDATE day_sheet_access_grants SET can_propose_shows=TRUE
WHERE scope_type IN ('all','countries') AND revoked_at IS NULL
  AND (expires_at IS NULL OR expires_at>NOW());

UPDATE day_sheet_access_invites SET can_propose_shows=TRUE
WHERE scope_type IN ('all','countries') AND status IN ('pending','accepted')
  AND revoked_at IS NULL AND expires_at>NOW();

COMMENT ON COLUMN show_proposals.proposed_show_id IS
  'The provisional pending-acceptance day sheet created with the proposal and promoted on acceptance.';
