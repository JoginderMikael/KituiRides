-- V2__add_vehicle_types_and_engine_size.sql
-- Add vehicle type and engine size to vehicles table

ALTER TABLE vehicles ADD COLUMN vehicle_type VARCHAR(20) DEFAULT 'CAR';
ALTER TABLE vehicles ADD COLUMN engine_size INT;

-- V3__create_admin_config_table.sql
-- Create admin configuration table for pricing parameters

CREATE TABLE admin_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default values
INSERT INTO admin_config (config_key, config_value, description) VALUES
('BASE_FARE', '100', 'Base fare in KES'),
('FUEL_COST_PER_LITER', '200', 'Current fuel cost per liter in KES'),
('DRIVER_MARKUP', '1.5', 'Driver markup multiplier (1.5 = 150%)'),
('COMPANY_COMMISSION_RATE', '0.20', 'Company commission rate (0.20 = 20%)'),
('MOTORCYCLE_FUEL_ECONOMY', '37', 'Fuel economy for motorcycles in km/l');

-- V4__create_driver_wallet_table.sql
-- Create driver wallet for commission tracking

CREATE TABLE driver_wallet (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    driver_id BIGINT NOT NULL UNIQUE,
    balance DECIMAL(10, 2) DEFAULT 0,
    total_earned DECIMAL(10, 2) DEFAULT 0,
    total_withdrawn DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES rider_profile(id)
);

-- V5__update_payment_status.sql
-- Update payment table with new payment status

ALTER TABLE payments ADD COLUMN payment_type VARCHAR(20) DEFAULT 'MPESA';
ALTER TABLE payments MODIFY COLUMN status VARCHAR(50) DEFAULT 'PENDING';
-- Status values: PENDING, PAID_MPESA, PAID_CASH, APPROVED

-- V6__create_chat_tables.sql
-- Create chat system tables

CREATE TABLE conversations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ride_id BIGINT,
    participant1_id BIGINT NOT NULL,
    participant2_id BIGINT NOT NULL,
    conversation_type VARCHAR(20), -- RIDE_CHAT, SUPPORT_CHAT
    support_agent_id BIGINT,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, ARCHIVED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(id),
    FOREIGN KEY (participant1_id) REFERENCES users(id),
    FOREIGN KEY (participant2_id) REFERENCES users(id),
    FOREIGN KEY (support_agent_id) REFERENCES users(id)
);

CREATE TABLE messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- V7__create_documents_table.sql
-- Create driver documents table

CREATE TABLE documents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    driver_id BIGINT NOT NULL,
    document_type VARCHAR(50), -- passport_photo, id_front, id_back, driver_license_front, driver_license_back, car_front, car_back, car_interior, insurance_sticker, chassis_number
    file_path VARCHAR(500),
    file_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP,
    approved_by BIGINT,
    rejection_reason TEXT,
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- V8__create_audit_log_table.sql
-- Create audit log for tracking admin changes

CREATE TABLE audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    admin_id BIGINT NOT NULL,
    entity_type VARCHAR(100),
    entity_id BIGINT,
    action VARCHAR(50), -- CREATE, UPDATE, DELETE, APPROVE, REJECT
    old_values JSON,
    new_values JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- V9__update_rides_table.sql
-- Update rides table for Phase 3 features

ALTER TABLE rides ADD COLUMN vehicle_type VARCHAR(20) DEFAULT 'CAR';
ALTER TABLE rides ADD COLUMN payment_type VARCHAR(20) DEFAULT 'MPESA';
ALTER TABLE rides ADD COLUMN distance_km DECIMAL(10, 2);
ALTER TABLE rides ADD COLUMN payment_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE rides ADD COLUMN support_ticket_id BIGINT;
ALTER TABLE rides ADD COLUMN driver_started_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN customer_canceled_at TIMESTAMP;
ALTER TABLE rides ADD COLUMN FOREIGN KEY (support_ticket_id) REFERENCES support_tickets(id);

-- V10__insert_initial_admin.sql
-- Insert initial admin account

INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, active, created_at, updated_at) 
VALUES ('Super', 'Admin', 'admin@example.com', 'replace-with-admin-phone', 'replace-with-generated-password-hash', 'ADMIN', true, NOW(), NOW());
-- Password hash for: admin@example.com
