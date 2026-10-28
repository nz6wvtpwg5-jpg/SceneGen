-- Canonicalize continent values produced by clients that predate the
-- @region: prefix. Preserve array order and all non-region values.
-- Revoke older equivalent pending invitations first so the existing unique
-- pending-scope index cannot be violated by normalization.
WITH normalized AS (
  SELECT invite.id, invite.entity_id, invite.email, invite.scope_type,
    invite.tour_id, invite.show_id, invite.created_at,
    (SELECT array_agg(CASE territory
      WHEN 'Europe' THEN '@region:Europe'
      WHEN 'Asia' THEN '@region:Asia'
      WHEN 'Africa' THEN '@region:Africa'
      WHEN 'North America' THEN '@region:North America'
      WHEN 'South America' THEN '@region:South America'
      WHEN 'Oceania' THEN '@region:Oceania'
      ELSE territory
    END ORDER BY ordinal)
    FROM unnest(invite.countries) WITH ORDINALITY AS value(territory, ordinal)) countries
  FROM day_sheet_access_invites invite
  WHERE invite.scope_type = 'countries' AND invite.status = 'pending'
), ranked AS (
  SELECT normalized.*,
    row_number() OVER (
      PARTITION BY entity_id, lower(email), scope_type,
        COALESCE(tour_id::text, ''), COALESCE(show_id::text, ''), countries
      ORDER BY created_at DESC, id DESC
    ) duplicate_rank
  FROM normalized
)
UPDATE day_sheet_access_invites invite
SET status = 'revoked', revoked_at = NOW()
FROM ranked
WHERE invite.id = ranked.id AND ranked.duplicate_rank > 1;

WITH normalized AS (
  SELECT grant_record.id,
    (SELECT array_agg(CASE territory
      WHEN 'Europe' THEN '@region:Europe'
      WHEN 'Asia' THEN '@region:Asia'
      WHEN 'Africa' THEN '@region:Africa'
      WHEN 'North America' THEN '@region:North America'
      WHEN 'South America' THEN '@region:South America'
      WHEN 'Oceania' THEN '@region:Oceania'
      ELSE territory
    END ORDER BY ordinal)
    FROM unnest(grant_record.countries) WITH ORDINALITY AS value(territory, ordinal)) countries
  FROM day_sheet_access_grants grant_record
  WHERE grant_record.scope_type = 'countries'
)
UPDATE day_sheet_access_grants grant_record
SET countries = normalized.countries
FROM normalized
WHERE grant_record.id = normalized.id
  AND grant_record.countries IS DISTINCT FROM normalized.countries;

WITH normalized AS (
  SELECT invite.id,
    (SELECT array_agg(CASE territory
      WHEN 'Europe' THEN '@region:Europe'
      WHEN 'Asia' THEN '@region:Asia'
      WHEN 'Africa' THEN '@region:Africa'
      WHEN 'North America' THEN '@region:North America'
      WHEN 'South America' THEN '@region:South America'
      WHEN 'Oceania' THEN '@region:Oceania'
      ELSE territory
    END ORDER BY ordinal)
    FROM unnest(invite.countries) WITH ORDINALITY AS value(territory, ordinal)) countries
  FROM day_sheet_access_invites invite
  WHERE invite.scope_type = 'countries'
)
UPDATE day_sheet_access_invites invite
SET countries = normalized.countries
FROM normalized
WHERE invite.id = normalized.id
  AND invite.countries IS DISTINCT FROM normalized.countries;
