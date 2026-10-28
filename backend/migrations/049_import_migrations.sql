CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('csv','spreadsheet','document','text','image')),
  source_name TEXT,
  source_preset TEXT NOT NULL DEFAULT 'generic' CHECK (source_preset IN ('generic','master_tour')),
  source_fingerprint TEXT NOT NULL,
  shows_created INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_entity_created
  ON import_batches(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_fingerprint
  ON import_batches(entity_id, source_fingerprint);
