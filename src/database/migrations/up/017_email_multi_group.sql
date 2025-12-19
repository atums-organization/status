INSERT INTO settings (key, value) VALUES
    ('email_is_global', 'true'),
    ('email_groups', '[]')
ON CONFLICT (key) DO NOTHING;
