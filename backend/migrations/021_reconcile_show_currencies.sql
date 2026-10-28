-- Reconcile legacy show rows with accounting currency confirmed by their linked
-- budgets or tour. Each budget source is used only when all valid rows agree.
WITH resolved AS (
  SELECT show_record.id,
    COALESCE(
      (SELECT min(upper(trim(budget.currency)))
       FROM budgets budget
       WHERE budget.show_id = show_record.id
         AND upper(trim(budget.currency)) ~ '^[A-Z]{3}$'
       HAVING count(DISTINCT upper(trim(budget.currency))) = 1),
      CASE WHEN upper(trim(tour.currency)) ~ '^[A-Z]{3}$' THEN upper(trim(tour.currency)) END,
      (SELECT min(upper(trim(budget.currency)))
       FROM budgets budget
       WHERE budget.tour_id = show_record.tour_id
         AND upper(trim(budget.currency)) ~ '^[A-Z]{3}$'
       HAVING count(DISTINCT upper(trim(budget.currency))) = 1),
      CASE WHEN upper(trim(show_record.currency)) ~ '^[A-Z]{3}$' THEN upper(trim(show_record.currency)) END
    ) currency
  FROM shows show_record
  LEFT JOIN tours tour ON tour.id = show_record.tour_id
)
UPDATE shows show_record
SET currency = resolved.currency
FROM resolved
WHERE show_record.id = resolved.id
  AND resolved.currency IS NOT NULL
  AND show_record.currency IS DISTINCT FROM resolved.currency;
