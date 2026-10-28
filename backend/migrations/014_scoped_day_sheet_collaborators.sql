CREATE OR REPLACE FUNCTION scenegen_country_key(value TEXT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE lower(regexp_replace(trim(COALESCE(value, '')), '[^a-zA-Z]', '', 'g'))
    WHEN 'us' THEN 'US' WHEN 'usa' THEN 'US' WHEN 'unitedstates' THEN 'US' WHEN 'unitedstatesofamerica' THEN 'US'
    WHEN 'ca' THEN 'CA' WHEN 'can' THEN 'CA' WHEN 'canada' THEN 'CA'
    WHEN 'uk' THEN 'GB' WHEN 'gb' THEN 'GB' WHEN 'gbr' THEN 'GB' WHEN 'unitedkingdom' THEN 'GB' WHEN 'greatbritain' THEN 'GB'
    ELSE upper(regexp_replace(trim(COALESCE(value, '')), '[^a-zA-Z]', '', 'g'))
  END
$$;

CREATE TABLE IF NOT EXISTS day_sheet_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL CHECK (access_level IN ('viewer', 'editor')),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('all', 'countries', 'tour', 'show')),
  countries TEXT[] NOT NULL DEFAULT '{}',
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CHECK (
    (scope_type = 'all' AND cardinality(countries) = 0 AND tour_id IS NULL AND show_id IS NULL) OR
    (scope_type = 'countries' AND cardinality(countries) > 0 AND tour_id IS NULL AND show_id IS NULL) OR
    (scope_type = 'tour' AND cardinality(countries) = 0 AND tour_id IS NOT NULL AND show_id IS NULL) OR
    (scope_type = 'show' AND cardinality(countries) = 0 AND tour_id IS NULL AND show_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS day_sheet_access_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email = lower(email)),
  access_level TEXT NOT NULL CHECK (access_level IN ('viewer', 'editor')),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('all', 'countries', 'tour', 'show')),
  countries TEXT[] NOT NULL DEFAULT '{}',
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CHECK (
    (scope_type = 'all' AND cardinality(countries) = 0 AND tour_id IS NULL AND show_id IS NULL) OR
    (scope_type = 'countries' AND cardinality(countries) > 0 AND tour_id IS NULL AND show_id IS NULL) OR
    (scope_type = 'tour' AND cardinality(countries) = 0 AND tour_id IS NOT NULL AND show_id IS NULL) OR
    (scope_type = 'show' AND cardinality(countries) = 0 AND tour_id IS NULL AND show_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_day_sheet_grants_user_active
  ON day_sheet_access_grants(user_id, entity_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_day_sheet_grants_entity_active
  ON day_sheet_access_grants(entity_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_day_sheet_invites_entity_status
  ON day_sheet_access_invites(entity_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_day_sheet_invites_pending_email_scope
  ON day_sheet_access_invites(entity_id, email, scope_type, COALESCE(tour_id::text, ''), COALESCE(show_id::text, ''), countries)
  WHERE status = 'pending';

COMMENT ON TABLE day_sheet_access_grants IS
  'Least-privilege access for external collaborators. These grants never confer general entity membership.';
