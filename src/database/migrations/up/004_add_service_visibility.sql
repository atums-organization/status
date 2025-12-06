ALTER TABLE services ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS group_name TEXT;

CREATE INDEX IF NOT EXISTS idx_services_is_public ON services(is_public);
CREATE INDEX IF NOT EXISTS idx_services_group_name ON services(group_name);
