-- A confirmed tour currency is authoritative for every linked show and budget.
UPDATE shows show_record
SET currency = upper(trim(tour.currency))
FROM tours tour
WHERE show_record.tour_id = tour.id
  AND upper(trim(tour.currency)) ~ '^[A-Z]{3}$'
  AND show_record.currency IS DISTINCT FROM upper(trim(tour.currency));

UPDATE budgets budget
SET currency = upper(trim(tour.currency))
FROM shows show_record
JOIN tours tour ON tour.id = show_record.tour_id
WHERE budget.show_id = show_record.id
  AND upper(trim(tour.currency)) ~ '^[A-Z]{3}$'
  AND budget.currency IS DISTINCT FROM upper(trim(tour.currency));

UPDATE budgets budget
SET currency = upper(trim(tour.currency))
FROM tours tour
WHERE budget.tour_id = tour.id
  AND upper(trim(tour.currency)) ~ '^[A-Z]{3}$'
  AND budget.currency IS DISTINCT FROM upper(trim(tour.currency));

CREATE OR REPLACE FUNCTION enforce_tour_currency_authority()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE authoritative_currency text;
BEGIN
  IF TG_TABLE_NAME = 'shows' AND NEW.tour_id IS NOT NULL THEN
    SELECT upper(trim(currency)) INTO authoritative_currency FROM tours WHERE id = NEW.tour_id;
  ELSIF TG_TABLE_NAME = 'budgets' THEN
    SELECT upper(trim(tour.currency)) INTO authoritative_currency
    FROM tours tour
    LEFT JOIN shows show_record ON show_record.tour_id = tour.id
    WHERE tour.id = NEW.tour_id OR show_record.id = NEW.show_id
    ORDER BY CASE WHEN tour.id = NEW.tour_id THEN 0 ELSE 1 END
    LIMIT 1;
  END IF;
  IF authoritative_currency ~ '^[A-Z]{3}$' THEN NEW.currency := authoritative_currency; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shows_tour_currency_authority ON shows;
CREATE TRIGGER shows_tour_currency_authority BEFORE INSERT OR UPDATE OF tour_id, currency ON shows
FOR EACH ROW EXECUTE FUNCTION enforce_tour_currency_authority();

DROP TRIGGER IF EXISTS budgets_tour_currency_authority ON budgets;
CREATE TRIGGER budgets_tour_currency_authority BEFORE INSERT OR UPDATE OF show_id, tour_id, currency ON budgets
FOR EACH ROW EXECUTE FUNCTION enforce_tour_currency_authority();

CREATE OR REPLACE FUNCTION cascade_tour_currency_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.currency IS DISTINCT FROM OLD.currency AND upper(trim(NEW.currency)) ~ '^[A-Z]{3}$' THEN
    UPDATE shows SET currency = upper(trim(NEW.currency)) WHERE tour_id = NEW.id;
    UPDATE budgets SET currency = upper(trim(NEW.currency))
      WHERE tour_id = NEW.id OR show_id IN (SELECT id FROM shows WHERE tour_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tours_currency_cascade ON tours;
CREATE TRIGGER tours_currency_cascade AFTER UPDATE OF currency ON tours
FOR EACH ROW EXECUTE FUNCTION cascade_tour_currency_change();
