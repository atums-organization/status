ALTER TABLE services ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

UPDATE services SET position = (
    SELECT COUNT(*) FROM services s2 WHERE s2.created_at <= services.created_at
) WHERE position = 0 OR position IS NULL;
