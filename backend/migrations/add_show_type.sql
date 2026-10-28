-- Add show_type column to shows table
-- This allows marking shows as regular, off days, or travel days

ALTER TABLE shows
ADD COLUMN show_type VARCHAR(20) DEFAULT 'show'
CHECK (show_type IN ('show', 'off_day', 'travel_day'));

-- Add index for querying by show type
CREATE INDEX idx_shows_show_type ON shows(show_type);

-- Update existing shows to be 'show' type (already default, but explicit)
UPDATE shows SET show_type = 'show' WHERE show_type IS NULL;

COMMENT ON COLUMN shows.show_type IS 'Type of show entry: show (regular performance), off_day (day off), or travel_day (travel between venues)';
