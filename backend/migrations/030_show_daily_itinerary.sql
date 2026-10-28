CREATE TABLE IF NOT EXISTS show_itinerary_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id VARCHAR(255) NOT NULL,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'call', 'travel', 'border', 'flight', 'ferry', 'accommodation',
    'production', 'performance', 'meal', 'other'
  )),
  day_offset SMALLINT NOT NULL DEFAULT 0 CHECK (day_offset BETWEEN -7 AND 7),
  event_time TIME,
  end_time TIME,
  location TEXT CHECK (location IS NULL OR char_length(location) <= 300),
  responsible_person TEXT CHECK (responsible_person IS NULL OR char_length(responsible_person) <= 120),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 3000),
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_show_itinerary_events_timeline
  ON show_itinerary_events(show_id, day_offset, event_time, sort_order)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_show_itinerary_events_entity
  ON show_itinerary_events(entity_id, show_id) WHERE archived_at IS NULL;

COMMENT ON TABLE show_itinerary_events IS
  'Custom operational events surrounding the authoritative run of show stored on each show.';
