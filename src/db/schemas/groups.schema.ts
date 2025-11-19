import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  // Encrypted credentials for this group (encrypted with user's global password)
  encryptedFacebookClientId: text('encrypted_facebook_client_id'),
  encryptedFacebookClientSecret: text('encrypted_facebook_client_secret'),
  encryptedTwitterClientId: text('encrypted_twitter_client_id'),
  encryptedTwitterClientSecret: text('encrypted_twitter_client_secret'),
  encryptedTwitterApiKey: text('encrypted_twitter_api_key'),
  encryptedTwitterApiSecret: text('encrypted_twitter_api_secret'),
  encryptedInstagramClientId: text('encrypted_instagram_client_id'),
  encryptedInstagramClientSecret: text('encrypted_instagram_client_secret'),
  encryptedLinkedinClientId: text('encrypted_linkedin_client_id'),
  encryptedLinkedinClientSecret: text('encrypted_linkedin_client_secret'),
  encryptedLinkedinAccessToken: text('encrypted_linkedin_access_token'),
  encryptedLinkedinOrganizationId: text('encrypted_linkedin_organization_id'),
  encryptedLinkedinGroupId: text('encrypted_linkedin_group_id'),
  encryptedTiktokClientId: text('encrypted_tiktok_client_id'),
  encryptedTiktokClientSecret: text('encrypted_tiktok_client_secret'),
  encryptedDiscordClientId: text('encrypted_discord_client_id'),
  encryptedDiscordClientSecret: text('encrypted_discord_client_secret'),
  // Facebook Page ID for Instagram posting (encrypted)
  encryptedFacebookPageId: text('encrypted_facebook_page_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

