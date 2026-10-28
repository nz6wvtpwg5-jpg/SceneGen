CREATE TABLE IF NOT EXISTS private_contact_shows (
  contact_id UUID NOT NULL REFERENCES private_contacts(id) ON DELETE CASCADE,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contact_id, show_id)
);

CREATE INDEX IF NOT EXISTS idx_private_contact_shows_entity
  ON private_contact_shows(entity_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_private_contact_shows_show
  ON private_contact_shows(show_id);

COMMENT ON TABLE private_contact_shows IS
  'Workspace-scoped provenance linking imported promoter contacts to their historical shows and venues.';
