-- Create audit log table
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
