UPDATE webhooks SET group_name = groups[1] WHERE array_length(groups, 1) > 0;
UPDATE webhooks SET group_name = NULL WHERE is_global = true;

ALTER TABLE webhooks DROP COLUMN IF EXISTS is_global;
ALTER TABLE webhooks DROP COLUMN IF EXISTS groups;

DROP INDEX IF EXISTS idx_webhooks_groups;
DROP INDEX IF EXISTS idx_webhooks_is_global;

CREATE INDEX IF NOT EXISTS idx_webhooks_group_name ON webhooks(group_name);
