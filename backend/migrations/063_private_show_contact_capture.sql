-- Capture only actual show contacts, within the performing workspace.
ALTER TABLE private_contacts ADD COLUMN IF NOT EXISTS auto_captured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE private_contact_shows ADD COLUMN IF NOT EXISTS venue_location JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE private_contact_shows ADD COLUMN IF NOT EXISTS band_genres JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE private_contacts SET auto_captured=TRUE WHERE tags ?| ARRAY['show contact','show import'];

CREATE OR REPLACE FUNCTION capture_show_contact() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  contact_uuid UUID;
  contact_name TEXT := left(trim(NEW.promoter_name),200);
  contact_email TEXT := lower(trim(NEW.promoter_email));
  band_tags JSONB;
BEGIN
  DELETE FROM private_contact_shows WHERE show_id=NEW.id;
  IF COALESCE(lower(contact_name),'') IN ('','tbd','not set','unknown')
     OR COALESCE(contact_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR length(contact_email)>254
     OR COALESCE(NEW.show_type,'show') IN ('off_day','travel_day') THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('show-promoter:' || NEW.entity_id::text || ':' || contact_email));
  INSERT INTO private_contacts(entity_id,kind,display_name,email,phone,roles,auto_captured)
  VALUES(NEW.entity_id::uuid,'person',contact_name,contact_email,NULLIF(left(trim(NEW.promoter_phone),80),''),'["promoter"]',TRUE)
  ON CONFLICT (entity_id,lower(email)) WHERE email IS NOT NULL AND trim(email)<>''
  DO UPDATE SET display_name=EXCLUDED.display_name,phone=EXCLUDED.phone,updated_at=NOW()
  RETURNING id INTO contact_uuid;
  SELECT CASE WHEN jsonb_typeof(tags)='array' THEN tags ELSE '[]'::jsonb END
    INTO band_tags FROM entities WHERE id::text=NEW.entity_id::text;
  INSERT INTO private_contact_shows(contact_id,show_id,entity_id,venue_location,band_genres)
  VALUES(contact_uuid,NEW.id,NEW.entity_id::uuid,
    jsonb_build_object('placeId',to_jsonb(NEW)->>'venue_place_id','name',NEW.venue_name,
      'address',NEW.venue_address,'city',NEW.city,'region',NEW.state,'country',NEW.country,
      'latitude',COALESCE(NEW.venue_lat,NEW.latitude),'longitude',COALESCE(NEW.venue_lng,NEW.longitude)),
    COALESCE(band_tags,'[]'::jsonb));
  RETURN NEW;
END $$;

CREATE TRIGGER capture_show_contact_after_save
AFTER INSERT OR UPDATE OF promoter_name,promoter_email,promoter_phone,venue_name,venue_address,
  venue_place_id,city,state,country,venue_lat,venue_lng,latitude,longitude,entity_id,show_type ON shows
FOR EACH ROW EXECUTE FUNCTION capture_show_contact();

-- Backfill existing dates in order so the most recent show supplies contact details.
-- Genre associations are the workspace's selected genres at capture time, not
-- a declaration of a promoter's preferences. No global discovery is exposed.
DO $$ DECLARE item RECORD; BEGIN
  FOR item IN SELECT id FROM shows ORDER BY date NULLS FIRST,id LOOP
    UPDATE shows SET promoter_email=promoter_email WHERE id=item.id;
  END LOOP;
END $$;
