-- Keep the built-in local driver eligible for matching on upgraded and fresh databases.
-- Earlier seed data created and approved the driver profile without a vehicle,
-- while MatchingService intentionally excludes drivers that have no vehicle.

ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS rider_profile_id BIGINT,
    ADD COLUMN IF NOT EXISTS make VARCHAR(255),
    ADD COLUMN IF NOT EXISTS color VARCHAR(255),
    ADD COLUMN IF NOT EXISTS plate_number VARCHAR(255),
    ADD COLUMN IF NOT EXISTS year_of_manufacture INT,
    ADD COLUMN IF NOT EXISTS front_photo_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS rear_photo_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS interior_photo_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS insurance_photo_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS chassis_photo_url VARCHAR(500);

CREATE UNIQUE INDEX IF NOT EXISTS ux_vehicles_plate_number
    ON vehicles(plate_number)
    WHERE plate_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_seed_driver_vehicle
    ON vehicles(rider_profile_id)
    WHERE rider_profile_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'vehicles'
          AND constraint_name = 'fk_vehicles_rider_profile'
    ) THEN
        ALTER TABLE vehicles
            ADD CONSTRAINT fk_vehicles_rider_profile
            FOREIGN KEY (rider_profile_id) REFERENCES rider_profiles(id);
    END IF;
END $$;

WITH seed_driver AS (
    SELECT rp.id AS rider_profile_id
    FROM rider_profiles rp
    JOIN users u ON u.id = rp.user_id
    WHERE u.email = 'antonytwaem@gmail.com'
)
INSERT INTO vehicles (
    rider_profile_id,
    make,
    model,
    color,
    plate_number,
    vehicle_type,
    engine_size,
    year_of_manufacture,
    created_at,
    updated_at
)
SELECT
    rider_profile_id,
    'Toyota',
    'Axio',
    'White',
    'KDA 001A',
    'CAR',
    1500,
    2020,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM seed_driver
WHERE NOT EXISTS (
    SELECT 1
    FROM vehicles existing
    WHERE existing.rider_profile_id = seed_driver.rider_profile_id
);
