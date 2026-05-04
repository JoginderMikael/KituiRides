CREATE TABLE IF NOT EXISTS processed_events (
    id UUID PRIMARY KEY,
    event_id UUID UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    topic VARCHAR(100),
    processed_at TIMESTAMP NOT NULL
);
