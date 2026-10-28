-- Venue details can be completed after a CSV import.
-- Imported off days, travel days, and partially confirmed dates may not have
-- a physical venue yet, so the database must not reject the whole tour.
ALTER TABLE shows
  ALTER COLUMN venue_address DROP NOT NULL;

COMMENT ON COLUMN shows.venue_address IS
  'Optional full venue address; may be completed after import or booking confirmation';
