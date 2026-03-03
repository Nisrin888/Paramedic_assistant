-- Expand audit_log for AI agent compliance tracking
ALTER TABLE audit_log
    ADD COLUMN IF NOT EXISTS session_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS agent_name VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tool_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tool_args JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS tool_result JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
    ADD COLUMN IF NOT EXISTS user_message TEXT,
    ADD COLUMN IF NOT EXISTS form_id UUID,
    ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- Index for compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_log(agent_name, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_tool ON audit_log(tool_name, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_form ON audit_log(form_id);
