-- Add LinkedIn Organization ID field to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS encrypted_linkedin_organization_id TEXT;
