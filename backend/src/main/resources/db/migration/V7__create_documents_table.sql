-- Create driver documents table
CREATE TABLE documents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    driver_id BIGINT NOT NULL,
    document_type VARCHAR(50),
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
