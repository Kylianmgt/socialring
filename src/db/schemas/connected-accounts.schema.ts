import { pgTable, serial, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { groups } from './groups.schema';

export const connectedAccounts = pgTable('connected_accounts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  groupId: integer('group_id')
    .references(() => groups.id, { onDelete: 'cascade' }),
  platform: varchar('platform', { length: 50 }).notNull(), // facebook, instagram, twitter, threads, linkedin, discord, tiktok
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accountId: varchar('account_id', { length: 255 }),
  profileUrl: text('profile_url'),
  profileImage: text('profile_image'),
  accessToken: text('access_token'), // For Twitter OAuth 1.0a: stores oauth_token
  refreshToken: text('refresh_token'), // For Twitter OAuth 1.0a: stores oauth_token_secret
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  isPage: integer('is_page').default(0), // 0 for personal account, 1 for page
  encryptedFacebookAccessToken: text('encrypted_facebook_access_token'),
  encryptedTwitterApiKey: text('encrypted_twitter_api_key'),
  encryptedTwitterApiSecret: text('encrypted_twitter_api_secret'),
  encryptedInstagramAccessToken: text('encrypted_instagram_access_token'),
  encryptedLinkedinAccessToken: text('encrypted_linkedin_access_token'),
  encryptedTiktokAccessToken: text('encrypted_tiktok_access_token'),
  encryptedDiscordAccessToken: text('encrypted_discord_access_token'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
