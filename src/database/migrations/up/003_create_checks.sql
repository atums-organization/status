CREATE TABLE IF NOT EXISTS service_checks (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    status_code INTEGER,
    response_time INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_checks_service_id ON service_checks(service_id);
CREATE INDEX IF NOT EXISTS idx_service_checks_checked_at ON service_checks(checked_at);
