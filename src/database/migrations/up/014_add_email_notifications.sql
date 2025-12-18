INSERT INTO settings (key, value) VALUES
    ('smtp_host', ''),
    ('smtp_port', '587'),
    ('smtp_user', ''),
    ('smtp_pass', ''),
    ('smtp_from', ''),
    ('smtp_secure', 'false'),
    ('smtp_enabled', 'false'),
    ('email_to', '')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT false;
