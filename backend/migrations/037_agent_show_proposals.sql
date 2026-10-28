ALTER TABLE day_sheet_access_invites
  ADD COLUMN IF NOT EXISTS can_propose_shows BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE day_sheet_access_grants
  ADD COLUMN IF NOT EXISTS can_propose_shows BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS show_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_grant_id UUID NOT NULL REFERENCES day_sheet_access_grants(id) ON DELETE RESTRICT,
  status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'changes_requested', 'accepted', 'declined', 'withdrawn')),
  show_date DATE NOT NULL,
  venue_place_id TEXT NOT NULL,
  venue_name VARCHAR(255) NOT NULL,
  venue_address TEXT NOT NULL,
  city VARCHAR(120) NOT NULL,
  region VARCHAR(120),
  country VARCHAR(100) NOT NULL,
  country_code CHAR(2) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DECIMAL(11, 8) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  offer_amount NUMERIC(12, 2) NOT NULL CHECK (offer_amount >= 0),
  deal_type VARCHAR(40) NOT NULL,
  offer_terms TEXT NOT NULL,
  notes TEXT,
  promoter_name VARCHAR(255),
  promoter_email VARCHAR(255),
  promoter_phone VARCHAR(50),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_note TEXT,
  accepted_show_id UUID REFERENCES shows(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_show_proposals_entity_status_date
  ON show_proposals(entity_id, status, show_date);
CREATE INDEX IF NOT EXISTS idx_show_proposals_agent_created
  ON show_proposals(proposed_by, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_show_proposals_active_venue_date
  ON show_proposals(entity_id, show_date, venue_place_id)
  WHERE status IN ('pending', 'changes_requested', 'accepted');

CREATE TABLE IF NOT EXISTS show_proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES show_proposals(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_type VARCHAR(32) NOT NULL
    CHECK (event_type IN ('submitted', 'changes_requested', 'accepted', 'declined', 'withdrawn')),
  note TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_show_proposal_events_proposal_created
  ON show_proposal_events(proposal_id, created_at);
