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
