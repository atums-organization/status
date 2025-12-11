CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'incident',
    status TEXT NOT NULL DEFAULT 'ongoing',
    group_name TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_group_name ON events(group_name);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_started_at ON events(started_at DESC);
