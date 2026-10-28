CREATE TABLE IF NOT EXISTS tour_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id VARCHAR(255) NOT NULL,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('contract','rider','stage_plot','hotel_confirmation','travel_document','other')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  mime_type TEXT NOT NULL CHECK (char_length(mime_type) BETWEEN 1 AND 150),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  content BYTEA NOT NULL,
  visible_to_collaborators BOOLEAN NOT NULL DEFAULT FALSE,
  permission_level TEXT NOT NULL DEFAULT 'operations' CHECK (permission_level IN ('operations','financial')),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (num_nonnulls(tour_id, show_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_tour_documents_show
  ON tour_documents(show_id, created_at DESC) WHERE show_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tour_documents_tour
  ON tour_documents(tour_id, created_at DESC) WHERE tour_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tour_documents_entity
  ON tour_documents(entity_id, created_at DESC);

COMMENT ON TABLE tour_documents IS
  'Private show and tour documents with explicit collaborator and financial visibility.';
