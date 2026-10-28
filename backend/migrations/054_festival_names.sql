ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS festival_name VARCHAR(255);

COMMENT ON COLUMN shows.festival_name IS
  'Optional public event or festival identity. The mapped venue remains stored separately for operations and routing.';
