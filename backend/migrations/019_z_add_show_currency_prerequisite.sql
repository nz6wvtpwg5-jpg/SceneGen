-- Migration 020 reconciles the accounting currency into shows.currency.
-- Older installations received this column from an untracked maintenance
-- script, so clean databases did not have it when the managed chain reached
-- migration 020. Keep this prerequisite idempotent for both new and existing
-- databases.
ALTER TABLE shows ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
