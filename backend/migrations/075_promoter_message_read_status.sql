-- Per-workspace message read state. The application checks pair membership
-- before modifying this record; no email/contact information is stored.
CREATE TABLE IF NOT EXISTS promoter_introduction_read_state (
  introduction_id UUID NOT NULL REFERENCES promoter_introductions(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(introduction_id,entity_id)
);
CREATE INDEX IF NOT EXISTS promoter_message_recent_index
  ON promoter_introduction_messages(introduction_id,created_at DESC,id DESC);
