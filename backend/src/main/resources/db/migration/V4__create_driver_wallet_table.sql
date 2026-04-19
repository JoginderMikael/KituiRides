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
