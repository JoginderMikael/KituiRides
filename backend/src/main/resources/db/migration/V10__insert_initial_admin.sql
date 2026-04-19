-- Insert initial admin account
INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, active, created_at, updated_at) 
VALUES ('Super', 'Admin', 'admin@example.com', 'replace-with-admin-phone', 'replace-with-generated-password-hash', 'ADMIN', true, NOW(), NOW());
-- Password: replace-with-a-strong-temporary-password
