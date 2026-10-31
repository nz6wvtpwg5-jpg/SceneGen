-- Distinguish a confirmed non-existent social profile from one not yet provided.
ALTER TABLE entities ADD COLUMN IF NOT EXISTS social_profile_absences JSONB NOT NULL DEFAULT '{}'::jsonb;
