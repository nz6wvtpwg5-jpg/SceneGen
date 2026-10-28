-- Calendar source labels belong to the import link, never a user's free-text notes.
ALTER TABLE calendar_import_sources
  ADD COLUMN IF NOT EXISTS event_title TEXT;

-- Preserve the titles from previously imported shows without touching Notes.
UPDATE calendar_import_sources AS cis
SET event_title = NULLIF(
  trim(split_part(split_part(s.notes, 'Imported calendar entry: ', 2), E'\n', 1)),
  ''
)
FROM shows AS s
WHERE cis.show_id = s.id
  AND cis.event_title IS NULL
  AND s.notes LIKE '%Imported calendar entry: %';
