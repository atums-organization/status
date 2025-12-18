CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'discord',
    group_name TEXT DEFAULT NULL,
    enabled BOOLEAN DEFAULT true,
    message_down TEXT DEFAULT '{service} is down',
    message_up TEXT DEFAULT '{service} is back up',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_group_name ON webhooks(group_name);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled);
