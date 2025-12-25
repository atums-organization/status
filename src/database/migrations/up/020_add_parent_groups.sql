ALTER TABLE groups ADD COLUMN IF NOT EXISTS parent_group_name TEXT;
CREATE INDEX IF NOT EXISTS idx_groups_parent ON groups(parent_group_name);
