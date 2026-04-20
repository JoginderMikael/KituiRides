UPDATE conversations
SET status = 'OPEN'
WHERE status = 'ACTIVE';

UPDATE conversations
SET status = 'CLOSED'
WHERE status = 'ARCHIVED';

UPDATE conversations c
SET conversation_type = CASE
    WHEN EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id IN (c.participant1_id, c.participant2_id)
          AND u.role = 'CUSTOMER'
    ) THEN 'SUPPORT_CUSTOMER'
    WHEN EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id IN (c.participant1_id, c.participant2_id)
          AND u.role = 'DRIVER'
    ) THEN 'SUPPORT_DRIVER'
    ELSE 'SUPPORT_ADMIN'
END
WHERE conversation_type = 'SUPPORT_CHAT';

ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;

UPDATE support_tickets
SET updated_at = COALESCE(updated_at, created_at);

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS support_ticket_id BIGINT,
    ADD COLUMN IF NOT EXISTS subject VARCHAR(255),
    ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS auto_closed_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_conversations_support_ticket'
    ) THEN
        ALTER TABLE conversations
            ADD CONSTRAINT fk_conversations_support_ticket
            FOREIGN KEY (support_ticket_id) REFERENCES support_tickets(id);
    END IF;
END $$;

UPDATE conversations
SET subject = COALESCE(subject, 'Support Case #' || id),
    last_message_at = COALESCE(last_message_at, updated_at);

ALTER TABLE messages
    ALTER COLUMN sender_id DROP NOT NULL;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS system_message BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS message_read_states (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_message_read_states_message_user UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_support_ticket_id ON conversations (support_ticket_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type_status_last_message ON conversations (conversation_type, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_read_states_user_id ON message_read_states (user_id);
