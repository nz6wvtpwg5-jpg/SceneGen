CREATE TABLE IF NOT EXISTS agent_created_band_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL CHECK (recipient_email = lower(recipient_email)),
  recipient_name TEXT CHECK (recipient_name IS NULL OR char_length(recipient_name) <= 120),
  band_name TEXT NOT NULL CHECK (char_length(band_name) BETWEEN 2 AND 255),
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 5000),
  city TEXT CHECK (city IS NULL OR char_length(city) <= 100),
  state TEXT CHECK (state IS NULL OR char_length(state) <= 100),
  country TEXT CHECK (country IS NULL OR char_length(country) <= 100),
  token_hash CHAR(64) NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_band_invites_agent_status
  ON agent_created_band_invitations(agent_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_band_invites_recipient_pending
  ON agent_created_band_invitations(recipient_email, expires_at)
  WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_band_invites_pending_roster
  ON agent_created_band_invitations(agent_user_id, recipient_email, lower(band_name))
  WHERE status = 'pending';

COMMENT ON TABLE agent_created_band_invitations IS
  'Provisional band profiles created by booking agents. No artist entity or ownership exists until the email-bound recipient accepts.';
