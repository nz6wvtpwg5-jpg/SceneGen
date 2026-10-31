-- A thread exists only after the promoter has accepted an introduction.
-- Replies are visible solely to the two workspace owners/admins.
CREATE TABLE IF NOT EXISTS promoter_introduction_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  introduction_id UUID NOT NULL REFERENCES promoter_introductions(id) ON DELETE CASCADE,
  sender_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS promoter_introduction_messages_thread
  ON promoter_introduction_messages(introduction_id,created_at,id);
