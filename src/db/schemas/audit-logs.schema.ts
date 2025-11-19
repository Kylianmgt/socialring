import { pgTable, serial, varchar, timestamp, jsonb, boolean, text, index } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id'),
    action: varchar('action').notNull(), // LOGIN_SUCCESS, PASSWORD_CHANGED, etc.
    resource: varchar('resource').notNull(), // 'authentication', 'post', 'account', etc.
    resourceId: varchar('resource_id'), // ID of the affected resource
    details: jsonb('details'), // Additional context as JSON
    ipAddress: varchar('ip_address'),
    userAgent: varchar('user_agent'),
    success: boolean('success').notNull().default(true),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      // Indexes for common queries
      userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
      actionIdx: index('audit_logs_action_idx').on(table.action),
      resourceIdx: index('audit_logs_resource_idx').on(table.resource),
      createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
      ipAddressIdx: index('audit_logs_ip_address_idx').on(table.ipAddress),
    };
  }
);
