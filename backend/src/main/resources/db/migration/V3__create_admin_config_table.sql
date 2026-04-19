-- Create admin configuration table for pricing parameters
CREATE TABLE admin_config (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default values
INSERT INTO admin_config (config_key, config_value, description) VALUES
('BASE_FARE', '100', 'Base fare in KES'),
('FUEL_COST_PER_LITER', '200', 'Current fuel cost per liter in KES'),
('DRIVER_MARKUP', '1.5', 'Driver markup multiplier (1.5 = 150%)'),
('COMPANY_COMMISSION_RATE', '0.20', 'Company commission rate (0.20 = 20%)'),
('MOTORCYCLE_FUEL_ECONOMY', '37', 'Fuel economy for motorcycles in km/l');
