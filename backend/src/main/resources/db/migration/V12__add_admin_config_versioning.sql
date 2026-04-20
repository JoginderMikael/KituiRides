ALTER TABLE admin_config
    ADD COLUMN IF NOT EXISTS updated_by_user_id BIGINT;

ALTER TABLE admin_config
    ADD COLUMN IF NOT EXISTS version BIGINT;

UPDATE admin_config
SET version = 1
WHERE version IS NULL;

ALTER TABLE admin_config
    ALTER COLUMN version SET DEFAULT 1;

ALTER TABLE admin_config
    ALTER COLUMN version SET NOT NULL;
