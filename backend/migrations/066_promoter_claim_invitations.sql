CREATE TABLE IF NOT EXISTS promoter_claim_invitations (
  email TEXT PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  invited_by_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  source_show_id UUID REFERENCES shows(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  promoter_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promoter_claim_invites_expiry ON promoter_claim_invitations(expires_at) WHERE claimed_at IS NULL;
CREATE TABLE IF NOT EXISTS promoter_claims (
  email TEXT PRIMARY KEY,
  entity_id UUID NOT NULL UNIQUE REFERENCES entities(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE promoter_claims IS 'Verified promoter ownership by email; private artist contact records are never merged into this profile.';
