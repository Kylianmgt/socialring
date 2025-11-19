-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  encrypted_facebook_client_id TEXT,
  encrypted_facebook_client_secret TEXT,
  encrypted_twitter_client_id TEXT,
  encrypted_twitter_client_secret TEXT,
  encrypted_instagram_client_id TEXT,
  encrypted_instagram_client_secret TEXT,
  encrypted_linkedin_client_id TEXT,
  encrypted_linkedin_client_secret TEXT,
  encrypted_tiktok_client_id TEXT,
  encrypted_tiktok_client_secret TEXT,
  encrypted_discord_client_id TEXT,
  encrypted_discord_client_secret TEXT,
  password_hint TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add group_id column to connected_accounts table
ALTER TABLE connected_accounts 
ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_group_id ON connected_accounts(group_id);
