ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'user_roles'
    ) THEN
        UPDATE users u
        SET role = ur.role
        FROM user_roles ur
        WHERE ur.user_id = u.id
          AND (u.role IS NULL OR u.role = '');
    END IF;
END $$;

UPDATE users
SET role = 'CUSTOMER'
WHERE role IS NULL OR role = '';

UPDATE users
SET role = 'DRIVER'
WHERE role = 'RIDER';

ALTER TABLE users ALTER COLUMN role SET NOT NULL;

DROP TABLE IF EXISTS user_roles;
