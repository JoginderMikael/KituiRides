-- Seed baseline accounts for a fresh local/system bootstrap.
-- Passwords are BCrypt hashes of the email address for each seeded user.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR(500);

ALTER TABLE rider_profiles
    ADD COLUMN IF NOT EXISTS user_id BIGINT,
    ADD COLUMN IF NOT EXISTS license_number VARCHAR(255),
    ADD COLUMN IF NOT EXISTS id_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS passport_photo_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(12, 2) DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'rider_profiles'
          AND constraint_name = 'fk_rider_profiles_user'
    ) THEN
        ALTER TABLE rider_profiles
            ADD CONSTRAINT fk_rider_profiles_user FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_rider_profiles_user_id ON rider_profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_rider_profiles_license_number ON rider_profiles(license_number);
CREATE UNIQUE INDEX IF NOT EXISTS ux_rider_profiles_id_number ON rider_profiles(id_number) WHERE id_number IS NOT NULL;

INSERT INTO users (
    first_name,
    last_name,
    email,
    phone_number,
    password_hash,
    role,
    active,
    created_at,
    updated_at,
    profile_photo_url
) VALUES
    (
        'Super',
        'Admin',
        'superadmin@kituirides.com',
        '+254700000001',
        '$2a$10$5SoLkp0/AlQSVSX1R2PER.vDHLMQeh8JQac8OjvFOXdsVT6a3HFSO',
        'ADMIN',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        NULL
    ),
    (
        'Antony',
        'Twaem',
        'antonytwaem@gmail.com',
        '+254700000002',
        '$2a$10$Xh/64U9SDmYH/ro95Nq0H.g5WfLs9rOMIOpTwsTvFpUT/lhw9S0aO',
        'DRIVER',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        NULL
    ),
    (
        'Noah',
        'Beki',
        'noahbeki34@gmail.com',
        '+254700000003',
        '$2a$10$29rrCBOacMBhpXkKaqADjOAS38d3i3HvbtcvKYc75hgNlrQCTEvi2',
        'CUSTOMER',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        NULL
    )
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    active = EXCLUDED.active,
    updated_at = CURRENT_TIMESTAMP;

WITH driver_user AS (
    SELECT id
    FROM users
    WHERE email = 'antonytwaem@gmail.com'
)
INSERT INTO rider_profiles (
    user_id,
    license_number,
    id_number,
    passport_photo_url,
    is_owner,
    verified,
    available,
    total_earnings,
    created_at,
    updated_at
)
SELECT
    id,
    'DL-KITUI-0001',
    'ID-KITUI-0001',
    NULL,
    true,
    true,
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM driver_user
ON CONFLICT (user_id) DO UPDATE SET
    license_number = EXCLUDED.license_number,
    id_number = EXCLUDED.id_number,
    is_owner = EXCLUDED.is_owner,
    verified = EXCLUDED.verified,
    available = EXCLUDED.available,
    updated_at = CURRENT_TIMESTAMP;

WITH driver_profile AS (
    SELECT rp.id
    FROM rider_profiles rp
    JOIN users u ON u.id = rp.user_id
    WHERE u.email = 'antonytwaem@gmail.com'
)
INSERT INTO driver_wallet (
    driver_id,
    balance,
    total_earned,
    total_withdrawn,
    outstanding_commission,
    created_at,
    updated_at
)
SELECT
    id,
    0,
    0,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM driver_profile
ON CONFLICT (driver_id) DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP;
