-- Add encrypted_password_marker column to groups table for password validation
ALTER TABLE groups ADD COLUMN encrypted_password_marker text;
