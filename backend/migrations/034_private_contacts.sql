CREATE TABLE IF NOT EXISTS private_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'person' CHECK (kind IN ('person','organization')),
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 1 AND 200),
  given_name TEXT CHECK (given_name IS NULL OR char_length(given_name) <= 100),
  surname TEXT CHECK (surname IS NULL OR char_length(surname) <= 100),
  organization TEXT CHECK (organization IS NULL OR char_length(organization) <= 200),
  job_title TEXT CHECK (job_title IS NULL OR char_length(job_title) <= 160),
  roles JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(roles) = 'array'),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 254),
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 80),
  preferred_contact_method TEXT CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email','phone','whatsapp','other')),
  city TEXT CHECK (city IS NULL OR char_length(city) <= 120),
  region TEXT CHECK (region IS NULL OR char_length(region) <= 120),
  country TEXT CHECK (country IS NULL OR char_length(country) <= 120),
  latitude NUMERIC(10,7) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude NUMERIC(10,7) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  territories JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(territories) = 'array'),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tags) = 'array'),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 10000),
  linked_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((latitude IS NULL) = (longitude IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_private_contacts_entity_name
  ON private_contacts(entity_id, lower(display_name));
CREATE INDEX IF NOT EXISTS idx_private_contacts_linked_entity
  ON private_contacts(entity_id, linked_entity_id) WHERE linked_entity_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_private_contacts_entity_email_unique
  ON private_contacts(entity_id, lower(email)) WHERE email IS NOT NULL AND trim(email) <> '';

COMMENT ON TABLE private_contacts IS
  'Workspace-private address-book contacts independent from reciprocal SceneGen connections.';