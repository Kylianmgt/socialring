import { pgTable, serial, varchar, text, timestamp, integer, json } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { groups } from './groups.schema';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }).notNull(),
  caption: text('caption'),
  mediaUrls: json('media_urls').$type<string[]>(),
  mediaTypes: json('media_types').$type<('image' | 'video')[]>(),
  platformResults: json('platform_results').$type<Record<string, { success: boolean; postId?: string; error?: string }>>(),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, posting, posted, failed
  postedAt: timestamp('posted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
