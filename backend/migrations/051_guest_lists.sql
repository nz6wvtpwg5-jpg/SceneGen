CREATE TABLE IF NOT EXISTS guest_list_settings (
  show_id UUID PRIMARY KEY REFERENCES shows(id) ON DELETE CASCADE,
  entity_id VARCHAR(255) NOT NULL,
  guest_limit INTEGER CHECK (guest_limit IS NULL OR guest_limit BETWEEN 0 AND 5000),
  requests_open BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_list_settings_entity
  ON guest_list_settings(entity_id, show_id);

CREATE TABLE IF NOT EXISTS guest_list_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id VARCHAR(255) NOT NULL,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL CHECK (char_length(trim(person_name)) BETWEEN 1 AND 120),
  allowance INTEGER NOT NULL CHECK (allowance BETWEEN 0 AND 500),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_list_allocations_entity_show
  ON guest_list_allocations(entity_id, show_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_list_allocations_show_person
  ON guest_list_allocations(show_id, lower(person_name));

CREATE TABLE IF NOT EXISTS guest_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id VARCHAR(255) NOT NULL,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  allocation_id UUID REFERENCES guest_list_allocations(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL CHECK (char_length(trim(guest_name)) BETWEEN 1 AND 160),
  requested_for TEXT NOT NULL CHECK (char_length(trim(requested_for)) BETWEEN 1 AND 120),
  plus_ones SMALLINT NOT NULL DEFAULT 0 CHECK (plus_ones BETWEEN 0 AND 10),
  pass_type TEXT NOT NULL DEFAULT 'guest' CHECK (pass_type IN ('guest','aftershow','all_access','photo','working')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  private_note TEXT CHECK (private_note IS NULL OR char_length(private_note) <= 1000),
  decision_note TEXT CHECK (decision_note IS NULL OR char_length(decision_note) <= 500),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_requests_door
  ON guest_requests(show_id, status, lower(guest_name));
CREATE INDEX IF NOT EXISTS idx_guest_requests_allocation
  ON guest_requests(allocation_id, status) WHERE allocation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guest_requests_entity_show
  ON guest_requests(entity_id, show_id);

COMMENT ON TABLE guest_requests IS
  'Private operational guest records. Contact details are intentionally not collected; door and export views omit internal notes.';
