INSERT INTO settings (key, value) VALUES
    ('retry_count', '0')
ON CONFLICT (key) DO NOTHING;
