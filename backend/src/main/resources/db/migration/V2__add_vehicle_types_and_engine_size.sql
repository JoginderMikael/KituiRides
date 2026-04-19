-- Add vehicle type and engine size to vehicles table
ALTER TABLE vehicles ADD COLUMN vehicle_type VARCHAR(20) DEFAULT 'CAR';
ALTER TABLE vehicles ADD COLUMN engine_size INT;
