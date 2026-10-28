ALTER TABLE tour_documents
  ADD COLUMN IF NOT EXISTS requires_acknowledgement BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS tour_document_receipts (
  document_id UUID NOT NULL REFERENCES tour_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tour_document_receipts_user
  ON tour_document_receipts(user_id, acknowledged_at DESC);

COMMENT ON TABLE tour_document_receipts IS
  'Durable acknowledgement receipt for an immutable uploaded document record.';
