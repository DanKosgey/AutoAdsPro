-- Migration: Add report_queue table
-- Run this in your Neon SQL Editor: https://console.neon.tech/

CREATE TABLE IF NOT EXISTS report_queue (
    id SERIAL PRIMARY KEY,
    contact_phone VARCHAR(50) NOT NULL,
    contact_name TEXT,
    conversation_id INTEGER REFERENCES conversations(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_attempt TIMESTAMP,
    last_message_time TIMESTAMP,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS report_queue_status_idx ON report_queue(status);

-- Verify table was created
SELECT 'report_queue table created successfully!' AS result;
