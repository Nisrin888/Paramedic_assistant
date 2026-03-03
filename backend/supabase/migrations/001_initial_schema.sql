-- Paramedic AI Assistant — Initial Schema
-- Supabase (PostgreSQL) — no MySQL ENUM, using TEXT + CHECK constraints

-- 1. CENTRAL AUTHENTICATION TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_type TEXT NOT NULL CHECK (role_type IN ('Paramedic', 'Supervisor', 'Admin')),
    is_active BOOLEAN DEFAULT TRUE,
    is_first_login BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PARAMEDIC PROFILE
CREATE TABLE IF NOT EXISTS paramedics (
    paramedic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    badge_number VARCHAR(20) UNIQUE NOT NULL
);

-- 3. SUPERVISOR PROFILE
CREATE TABLE IF NOT EXISTS supervisors (
    supervisor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    expert_type TEXT CHECK (expert_type IN ('EMS', 'AI', 'Industry'))
);

-- 4. RELATIONSHIP & OPERATIONAL MAPPING
CREATE TABLE IF NOT EXISTS supervisor_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paramedic_id UUID REFERENCES paramedics(paramedic_id),
    supervisor_id UUID REFERENCES supervisors(supervisor_id),
    station_assignment VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS shifts (
    shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medic_1_id UUID REFERENCES paramedics(paramedic_id),
    medic_2_id UUID REFERENCES paramedics(paramedic_id),
    station VARCHAR(100),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL
);

-- 5. PERSONA & BEHAVIOR
CREATE TABLE IF NOT EXISTS user_personas (
    persona_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    preferred_name VARCHAR(100),
    speaking_style TEXT DEFAULT 'Friendly' CHECK (speaking_style IN ('Professional', 'Casual', 'Concise', 'Friendly')),
    voice_preference TEXT DEFAULT 'Female' CHECK (voice_preference IN ('Male', 'Female')),
    vocabulary_flags TEXT[],
    interaction_patterns JSONB DEFAULT '{}',
    guidance_level_override TEXT CHECK (guidance_level_override IN ('FULL', 'BRIEF', 'MINIMAL')),
    last_trained_at TIMESTAMPTZ DEFAULT now()
);

-- 6. FORM 4: COMPLIANCE & READINESS
CREATE TABLE IF NOT EXISTS form4_reference (
    id VARCHAR(20) PRIMARY KEY,
    label VARCHAR(100),
    description TEXT,
    urgency_class TEXT CHECK (urgency_class IN ('BLOCKING', 'TIME_BOUND', 'INFO')),
    guidance_summary TEXT,
    guidance_steps TEXT[]
);

CREATE TABLE IF NOT EXISTS form4_user_state (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    item_id VARCHAR(20) REFERENCES form4_reference(id),
    count INT DEFAULT 0,
    status TEXT DEFAULT 'UNKNOWN' CHECK (status IN ('GOOD', 'BAD', 'UNKNOWN')),
    due_date TIMESTAMPTZ,
    acknowledged BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, item_id)
);

-- 7. DOCUMENTATION FORMS
CREATE TABLE IF NOT EXISTS occurrence_reports (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES paramedics(paramedic_id),
    supervisor_id UUID REFERENCES supervisors(supervisor_id),
    shift_id UUID REFERENCES shifts(shift_id),
    incident_date_time TIMESTAMPTZ NOT NULL,
    classification VARCHAR(50),
    description_of_event TEXT,
    action_taken TEXT,
    management_notes TEXT,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Reviewed'))
);

CREATE TABLE IF NOT EXISTS teddy_bear_tracking (
    tracking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_medic_id UUID REFERENCES paramedics(paramedic_id),
    secondary_medic_id UUID REFERENCES paramedics(paramedic_id),
    shift_id UUID REFERENCES shifts(shift_id),
    distribution_timestamp TIMESTAMPTZ NOT NULL,
    recipient_type TEXT CHECK (recipient_type IN ('Patient', 'Family', 'Bystander', 'Other')),
    recipient_age INT,
    recipient_gender TEXT CHECK (recipient_gender IN ('Male', 'Female', 'Other', 'Prefer not to say'))
);

-- 8. OUTSTANDING ITEMS (cross-shift task tracking)
CREATE TABLE IF NOT EXISTS outstanding_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(shift_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('form', 'checklist', 'task', 'other')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'deferred')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_paramedics_badge ON paramedics(badge_number);
CREATE INDEX IF NOT EXISTS idx_shifts_time ON shifts(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_outstanding_user ON outstanding_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at);
