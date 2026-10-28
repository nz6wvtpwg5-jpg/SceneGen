CREATE TABLE IF NOT EXISTS show_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id VARCHAR(255) NOT NULL,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 3000),
  severity TEXT NOT NULL DEFAULT 'important' CHECK (severity IN ('info','important','urgent')),
  requires_acknowledgement BOOLEAN NOT NULL DEFAULT FALSE,
  visible_to_collaborators BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (num_nonnulls(tour_id, show_id) = 1)
);

CREATE TABLE IF NOT EXISTS show_notice_receipts (
  notice_id UUID NOT NULL REFERENCES show_notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  PRIMARY KEY (notice_id, user_id)
);

CREATE TABLE IF NOT EXISTS show_portal_visits (
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (show_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_show_notices_show_active
  ON show_notices(show_id, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_show_notices_tour_active
  ON show_notices(tour_id, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_show_notices_entity_active
  ON show_notices(entity_id, created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_show_notice_receipts_user
  ON show_notice_receipts(user_id, seen_at DESC);

COMMENT ON TABLE show_notices IS
  'Urgent and informational notices assigned to one show or a whole tour.';
COMMENT ON TABLE show_notice_receipts IS
  'Durable proof that a user saw or acknowledged a notice.';
COMMENT ON TABLE show_portal_visits IS
  'Per-user checkpoint used by the changed-since-last-visit feed.';
