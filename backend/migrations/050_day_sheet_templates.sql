CREATE TABLE IF NOT EXISTS day_sheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  template_kind TEXT NOT NULL CHECK (template_kind IN ('show_day','travel_day','festival_day','off_day')),
  load_in_time TIME,
  sound_check_time TIME,
  door_time TIME,
  start_time TIME,
  end_time TIME,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_day_sheet_templates_entity_name
  ON day_sheet_templates(entity_id, lower(name));

CREATE TABLE IF NOT EXISTS day_sheet_template_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES day_sheet_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  category TEXT NOT NULL CHECK (category IN ('call','travel','border','flight','ferry','accommodation','production','performance','meal','other')),
  day_offset SMALLINT NOT NULL DEFAULT 0 CHECK (day_offset BETWEEN -7 AND 7),
  event_time TIME,
  end_time TIME,
  location TEXT CHECK (location IS NULL OR char_length(location) <= 300),
  responsible_person TEXT CHECK (responsible_person IS NULL OR char_length(responsible_person) <= 120),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 3000),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_day_sheet_template_events_order
  ON day_sheet_template_events(template_id, day_offset, event_time, sort_order);

COMMENT ON TABLE day_sheet_templates IS
  'Organisation-owned reusable schedule templates. Venue, contacts, finances and show notes are intentionally excluded.';
