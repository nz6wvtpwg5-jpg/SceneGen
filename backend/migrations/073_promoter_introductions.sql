-- Explicitly opt-in, private, workspace-bound booking introductions.
CREATE TABLE IF NOT EXISTS promoter_outreach_preferences (
  promoter_entity_id UUID PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  accepting_introductions BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS promoter_introductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  promoter_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 30 AND 1200),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT promoter_introductions_distinct_workspaces CHECK (artist_entity_id <> promoter_entity_id)
);
-- One unsolicited introduction per artist/promoter pair. An accepted request
-- does not grant permission to repeatedly contact the promoter.
CREATE UNIQUE INDEX IF NOT EXISTS promoter_introductions_pair_unique
  ON promoter_introductions(artist_entity_id,promoter_entity_id);
CREATE INDEX IF NOT EXISTS promoter_introductions_received
  ON promoter_introductions(promoter_entity_id,created_at DESC);
CREATE INDEX IF NOT EXISTS promoter_introductions_sent
  ON promoter_introductions(artist_entity_id,created_at DESC);
