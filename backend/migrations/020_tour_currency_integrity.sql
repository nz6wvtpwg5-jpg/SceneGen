ALTER TABLE tours ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE tours DROP CONSTRAINT IF EXISTS tours_currency_iso_code;
ALTER TABLE tours ADD CONSTRAINT tours_currency_iso_code
  CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$');

-- A single budget currency for a show is authoritative accounting data.
WITH show_currency AS (
  SELECT show_id, min(currency) currency
  FROM budgets
  WHERE show_id IS NOT NULL AND currency ~ '^[A-Z]{3}$'
  GROUP BY show_id
  HAVING count(DISTINCT currency) = 1
)
UPDATE shows show_record SET currency = show_currency.currency
FROM show_currency
WHERE show_record.id = show_currency.show_id
  AND show_record.currency IS DISTINCT FROM show_currency.currency;

-- Only initialize a tour when every linked budget agrees and the tour has no
-- confirmed currency yet. Never rewrite an established tour currency.
WITH tour_currency AS (
  SELECT tour_id, min(currency) currency
  FROM budgets
  WHERE tour_id IS NOT NULL AND currency ~ '^[A-Z]{3}$'
  GROUP BY tour_id
  HAVING count(DISTINCT currency) = 1
)
UPDATE tours tour_record SET currency = tour_currency.currency
FROM tour_currency
WHERE tour_record.id = tour_currency.tour_id
  AND tour_record.currency IS NULL;

COMMENT ON COLUMN tours.currency IS
  'Confirmed ISO 4217 currency inherited by shows on this tour unless explicitly overridden.';
