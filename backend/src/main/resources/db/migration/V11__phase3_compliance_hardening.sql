UPDATE rides SET status = 'DRIVER_ASSIGNED' WHERE status = 'MATCHED';
UPDATE rides SET status = 'DRIVER_ACCEPTED' WHERE status = 'ACCEPTED';
UPDATE rides SET status = 'TRIP_STARTED' WHERE status = 'STARTED';
UPDATE rides SET status = 'TRIP_COMPLETED' WHERE status = 'COMPLETED';
UPDATE rides SET status = 'TRIP_CANCELLED' WHERE status = 'CANCELLED';

ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_assigned_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS payment_pending_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS chargeable_distance_km DECIMAL(10, 2);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS distance_source VARCHAR(30) DEFAULT 'ESTIMATED';
ALTER TABLE rides ADD COLUMN IF NOT EXISTS manual_distance_required BOOLEAN DEFAULT FALSE;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_checkout_request_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_merchant_request_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_receipt_number VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_response_code VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_response_description TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS callback_payload TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE driver_wallet ADD COLUMN IF NOT EXISTS outstanding_commission DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(30) DEFAULT 'GENERAL';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ride_id BIGINT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

CREATE TABLE IF NOT EXISTS ride_offers (
    id BIGSERIAL PRIMARY KEY,
    ride_id BIGINT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    driver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    offered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP + INTERVAL '120 seconds',
    responded_at TIMESTAMP,
    CONSTRAINT uq_ride_offer_per_driver UNIQUE (ride_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_ride_offers_driver_status ON ride_offers(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_offers_ride_status ON ride_offers(ride_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS ux_active_customer_ride
ON rides(customer_id)
WHERE status IN (
    'REQUESTED',
    'DRIVER_ASSIGNED',
    'DRIVER_ACCEPTED',
    'DRIVER_ARRIVED',
    'TRIP_STARTED',
    'PAYMENT_PENDING',
    'PAYMENT_COMPLETED',
    'DISPUTED'
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_active_driver_ride
ON rides(rider_id)
WHERE rider_id IS NOT NULL
  AND status IN (
    'DRIVER_ACCEPTED',
    'DRIVER_ARRIVED',
    'TRIP_STARTED',
    'PAYMENT_PENDING',
    'PAYMENT_COMPLETED',
    'DISPUTED'
);

INSERT INTO admin_config (config_key, config_value, description, created_at, updated_at)
SELECT 'SUPPORT_PHONE_NUMBER', '+254797753625', 'Support hotline for customer and driver calls', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM admin_config WHERE config_key = 'SUPPORT_PHONE_NUMBER'
);
