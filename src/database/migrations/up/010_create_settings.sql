CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
    ('site_name', 'atums/status'),
    ('site_url', ''),
    ('source_url', 'https://heliopolis.live/atums/status'),
    ('discord_url', ''),
    ('security_contact', ''),
    ('security_canonical', '/.well-known/security.txt')
ON CONFLICT (key) DO NOTHING;
