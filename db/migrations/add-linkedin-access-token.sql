-- Add LinkedIn access token field to groups table
ALTER TABLE groups ADD COLUMN encrypted_linkedin_access_token text;
