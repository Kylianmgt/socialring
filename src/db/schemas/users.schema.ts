import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  // Global password for accessing groups and managing accounts (encrypted hash)
  encryptedGlobalPassword: text('encrypted_global_password'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
