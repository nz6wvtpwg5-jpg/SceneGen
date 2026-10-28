-- Create show_shares table for sharing shows with external users
CREATE TABLE IF NOT EXISTS show_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    created_by_entity_id UUID NOT NULL REFERENCES entities(id),
    recipient_email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    can_edit BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_show_shares_token ON show_shares(token);
CREATE INDEX IF NOT EXISTS idx_show_shares_show_id ON show_shares(show_id);
CREATE INDEX IF NOT EXISTS idx_show_shares_email ON show_shares(recipient_email);
