-- Unknown location and accounting data must remain unknown. Application write
-- paths now require an explicit ISO currency and store a missing country as
-- NULL instead of silently claiming that it is USA/USD.
ALTER TABLE shows
  ALTER COLUMN country DROP DEFAULT;

ALTER TABLE budgets
  ALTER COLUMN currency DROP DEFAULT;

COMMENT ON COLUMN shows.country IS
  'Optional country supplied or confirmed by the user; never inferred as USA';
COMMENT ON COLUMN budgets.currency IS
  'ISO 4217 accounting currency explicitly selected by the user';
