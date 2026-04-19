-- Update rides table for Phase 3 features
ALTER TABLE rides ADD COLUMN vehicle_type VARCHAR(20) DEFAULT 'CAR';
ALTER TABLE rides ADD COLUMN payment_type VARCHAR(20) DEFAULT 'MPESA';
ALTER TABLE rides ADD COLUMN distance_km DECIMAL(10, 2);
ALTER TABLE rides ADD COLUMN payment_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE rides ADD COLUMN support_ticket_id BIGINT;
ALTER TABLE rides ADD COLUMN driver_started_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN customer_canceled_at TIMESTAMP;
ALTER TABLE rides ADD FOREIGN KEY (support_ticket_id) REFERENCES support_tickets(id);
