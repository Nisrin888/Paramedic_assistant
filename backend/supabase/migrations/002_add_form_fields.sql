-- Migration 002: Add missing form fields from actual EMS forms
-- Run this in Supabase SQL Editor

-- Add vehicle/service info to shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(20);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS vehicle_description VARCHAR(100);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS service VARCHAR(100);

-- Expand occurrence_reports with all fields from actual form
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS call_number VARCHAR(50);
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS classification_details TEXT;
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS occurrence_type VARCHAR(50);
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS occurrence_reference VARCHAR(50);
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS brief_description TEXT;
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS service VARCHAR(100);
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(20);
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS vehicle_description VARCHAR(100);
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS role_description TEXT;
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS badge_number VARCHAR(20);
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS other_services_involved TEXT[];
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS suggested_resolution TEXT;
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS requested_by VARCHAR(200);
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS requested_by_details TEXT;
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS report_creator VARCHAR(200);
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS creator_details TEXT;
ALTER TABLE occurrence_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
