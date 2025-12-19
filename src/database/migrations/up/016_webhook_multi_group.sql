ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS groups TEXT[] DEFAULT '{}';

UPDATE webhooks SET is_global = true WHERE group_name IS NULL;

UPDATE webhooks SET groups = ARRAY[group_name] WHERE group_name IS NOT NULL;

DROP INDEX IF EXISTS idx_webhooks_group_name;

CREATE INDEX IF NOT EXISTS idx_webhooks_groups ON webhooks USING GIN(groups);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_global ON webhooks(is_global);
