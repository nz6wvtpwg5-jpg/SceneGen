-- Track the originating Google Calendar event separately from user-editable show
-- notes. One Google event can yield more than one explicitly chosen show date.
-- A source event may be imported to separate band workspaces independently.
CREATE TABLE IF NOT EXISTS calendar_import_sources (
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google' CHECK (provider = 'google'),
  event_id TEXT NOT NULL CHECK (char_length(event_id) BETWEEN 1 AND 240),
  event_date DATE NOT NULL,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_id, provider, event_id, event_date),
  UNIQUE (show_id)
);

CREATE INDEX IF NOT EXISTS calendar_import_sources_show_idx ON calendar_import_sources(show_id);
COMMENT ON TABLE calendar_import_sources IS
  'Private, workspace-scoped links from explicitly selected Google Calendar events to SceneGen shows.';
