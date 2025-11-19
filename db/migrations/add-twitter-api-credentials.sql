-- Add Twitter OAuth 1.0a API credentials columns
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS encrypted_twitter_api_key TEXT,
ADD COLUMN IF NOT EXISTS encrypted_twitter_api_secret TEXT;
