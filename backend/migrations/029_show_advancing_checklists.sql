CREATE TABLE IF NOT EXISTS show_advance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id VARCHAR(255) NOT NULL,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  assignee TEXT CHECK (assignee IS NULL OR char_length(assignee) <= 120),
  due_date DATE,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (show_id, title)
);

CREATE INDEX IF NOT EXISTS idx_show_advance_tasks_show_order
  ON show_advance_tasks(show_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_show_advance_tasks_entity_incomplete
  ON show_advance_tasks(entity_id, due_date) WHERE status <> 'done';

CREATE OR REPLACE FUNCTION seed_show_advance_tasks() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO show_advance_tasks (entity_id, show_id, title, sort_order) VALUES
    (NEW.entity_id, NEW.id, 'Venue and address confirmed', 10),
    (NEW.entity_id, NEW.id, 'Promoter contact confirmed', 20),
    (NEW.entity_id, NEW.id, 'Load-in and production times confirmed', 30),
    (NEW.entity_id, NEW.id, 'Technical requirements confirmed', 40),
    (NEW.entity_id, NEW.id, 'Hospitality and catering confirmed', 50),
    (NEW.entity_id, NEW.id, 'Parking and vehicle access confirmed', 60),
    (NEW.entity_id, NEW.id, 'Guest-list procedure confirmed', 70),
    (NEW.entity_id, NEW.id, 'Deal and payment details confirmed', 80)
  ON CONFLICT (show_id, title) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_show_advance_tasks ON shows;
CREATE TRIGGER trg_seed_show_advance_tasks
  AFTER INSERT ON shows FOR EACH ROW EXECUTE FUNCTION seed_show_advance_tasks();

INSERT INTO show_advance_tasks (entity_id, show_id, title, sort_order)
SELECT s.entity_id, s.id, task.title, task.sort_order
FROM shows s
CROSS JOIN (VALUES
  ('Venue and address confirmed', 10),
  ('Promoter contact confirmed', 20),
  ('Load-in and production times confirmed', 30),
  ('Technical requirements confirmed', 40),
  ('Hospitality and catering confirmed', 50),
  ('Parking and vehicle access confirmed', 60),
  ('Guest-list procedure confirmed', 70),
  ('Deal and payment details confirmed', 80)
) AS task(title, sort_order)
ON CONFLICT (show_id, title) DO NOTHING;

COMMENT ON TABLE show_advance_tasks IS
  'Show-scoped advancing checklist used to calculate operational readiness.';
