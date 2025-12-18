ALTER TABLE services ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT false;
