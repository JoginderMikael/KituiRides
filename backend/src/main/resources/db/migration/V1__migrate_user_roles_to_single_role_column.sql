-- Add role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50);
    END IF;
END $$;

-- Migrate from user_roles table if it exists
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

-- Set default role for users without one
UPDATE users
SET role = 'CUSTOMER'
WHERE role IS NULL OR role = '';

-- Ensure role is not null
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Drop old user_roles table if it exists
DROP TABLE IF EXISTS user_roles;
