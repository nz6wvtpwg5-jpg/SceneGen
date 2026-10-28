ALTER TABLE artist_agent_relationships DROP CONSTRAINT IF EXISTS artist_agent_relationships_status_check;
ALTER TABLE artist_agent_relationships ADD CONSTRAINT artist_agent_relationships_status_check
  CHECK (status IN ('requested', 'changes_requested', 'approved', 'active', 'paused', 'ended', 'declined'));

DROP INDEX IF EXISTS idx_artist_agent_relationship_current;
CREATE UNIQUE INDEX idx_artist_agent_relationship_current
  ON artist_agent_relationships(entity_id, agent_user_id)
  WHERE status IN ('requested', 'changes_requested', 'approved', 'active', 'paused');

ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_purpose_check
  CHECK (purpose IN ('verify_email', 'reset_password', 'collaborator_login', 'registration_status', 'booking_agent_activation'));

COMMENT ON COLUMN auth_tokens.purpose IS
  'Single-purpose opaque authentication tokens, including collaborator-to-booking-agent session activation.';

ALTER TABLE artist_agent_relationships
  ADD COLUMN IF NOT EXISTS activation_email_sent_at TIMESTAMPTZ;
