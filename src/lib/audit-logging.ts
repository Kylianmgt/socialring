/**
 * Audit logging utilities
 * Logs security-relevant events for compliance and debugging
 */

import { db } from './db';
import { auditLogs } from '@/db/schemas';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

export enum AuditAction {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Account security
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',

  // Account connections
  ACCOUNT_CONNECTED = 'ACCOUNT_CONNECTED',
  ACCOUNT_DISCONNECTED = 'ACCOUNT_DISCONNECTED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',

  // Posts
  POST_CREATED = 'POST_CREATED',
  POST_DELETED = 'POST_DELETED',
  POST_PUBLISHED = 'POST_PUBLISHED',

  // Groups
  GROUP_CREATED = 'GROUP_CREATED',
  GROUP_UPDATED = 'GROUP_UPDATED',
  GROUP_DELETED = 'GROUP_DELETED',

  // Security events
  CSRF_VALIDATION_FAILED = 'CSRF_VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',

  // Admin actions
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
}

export interface AuditLogEntry {
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string | null;
}

/**
 * Extract client information from request
 */
export function extractClientInfo(request: NextRequest) {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-client-ip') ||
    'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Only log if database is available
    if (!db) {
      console.warn('[AuditLog] Database not available, skipping audit log');
      return;
    }

    await db.insert(auditLogs).values({
      userId: entry.userId || null,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId || null,
      details: entry.details || null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      success: entry.success,
      errorMessage: entry.errorMessage || null,
      createdAt: new Date(),
    });
  } catch (error) {
    // Never let audit logging errors break the application
    console.error('[AuditLog] Failed to create audit log:', error);
  }
}

/**
 * Log a successful login
 */
export async function logLoginSuccess(
  request: NextRequest,
  userId: string,
  provider: string
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    userId,
    action: AuditAction.LOGIN_SUCCESS,
    resource: 'authentication',
    details: { provider, method: 'oauth' },
    ipAddress,
    userAgent,
    success: true,
  });
}

/**
 * Log a failed login attempt
 */
export async function logLoginFailure(
  request: NextRequest,
  email: string,
  reason: string
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    action: AuditAction.LOGIN_FAILURE,
    resource: 'authentication',
    resourceId: email,
    details: { email, reason },
    ipAddress,
    userAgent,
    success: false,
    errorMessage: reason,
  });
}

/**
 * Log password change
 */
export async function logPasswordChange(
  userId: string,
  request: NextRequest,
  success: boolean = true
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    userId,
    action: AuditAction.PASSWORD_CHANGED,
    resource: 'user',
    resourceId: userId,
    ipAddress,
    userAgent,
    success,
  });
}

/**
 * Log account connection
 */
export async function logAccountConnected(
  userId: string,
  request: NextRequest,
  platform: string,
  accountName: string
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    userId,
    action: AuditAction.ACCOUNT_CONNECTED,
    resource: 'account',
    resourceId: `${platform}:${accountName}`,
    details: { platform, accountName },
    ipAddress,
    userAgent,
    success: true,
  });
}

/**
 * Log account disconnection
 */
export async function logAccountDisconnected(
  userId: string,
  request: NextRequest,
  platform: string,
  accountId: string
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    userId,
    action: AuditAction.ACCOUNT_DISCONNECTED,
    resource: 'account',
    resourceId: accountId,
    details: { platform },
    ipAddress,
    userAgent,
    success: true,
  });
}

/**
 * Log post creation
 */
export async function logPostCreated(
  userId: string,
  request: NextRequest,
  postId: string,
  platforms: string[]
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    userId,
    action: AuditAction.POST_CREATED,
    resource: 'post',
    resourceId: postId,
    details: { platforms, platformCount: platforms.length },
    ipAddress,
    userAgent,
    success: true,
  });
}

/**
 * Log post deletion
 */
export async function logPostDeleted(
  userId: string,
  request: NextRequest,
  postId: string
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    userId,
    action: AuditAction.POST_DELETED,
    resource: 'post',
    resourceId: postId,
    ipAddress,
    userAgent,
    success: true,
  });
}

/**
 * Log CSRF validation failure
 */
export async function logCsrfFailure(
  request: NextRequest,
  userId?: string
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    userId: userId || null,
    action: AuditAction.CSRF_VALIDATION_FAILED,
    resource: 'security',
    details: { endpoint: request.nextUrl.pathname, method: request.method },
    ipAddress,
    userAgent,
    success: false,
    errorMessage: 'CSRF token validation failed',
  });
}

/**
 * Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  request: NextRequest,
  userId?: string
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    userId: userId || null,
    action: AuditAction.RATE_LIMIT_EXCEEDED,
    resource: 'security',
    details: { endpoint: request.nextUrl.pathname },
    ipAddress,
    userAgent,
    success: false,
    errorMessage: 'Rate limit exceeded',
  });
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(
  request: NextRequest,
  reason: string,
  userId?: string
): Promise<void> {
  const { ipAddress, userAgent } = extractClientInfo(request);

  await createAuditLog({
    userId: userId || null,
    action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
    resource: 'security',
    details: { endpoint: request.nextUrl.pathname, reason },
    ipAddress,
    userAgent,
    success: false,
    errorMessage: reason,
  });
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
): Promise<typeof auditLogs.$inferSelect[]> {
  try {
    const result = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(auditLogs.createdAt)
      .limit(limit)
      .execute();

    return result;
  } catch {
    console.error('[AuditLog] Failed to fetch audit logs');
    return [];
  }
}

/**
 * Get audit logs for a specific action
 */
export async function getAuditLogsByAction(
  action: AuditAction,
  limit: number = 50
): Promise<typeof auditLogs.$inferSelect[]> {
  try {
    const result = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, action))
      .orderBy(auditLogs.createdAt)
      .limit(limit)
      .execute();

    return result;
  } catch {
    console.error('[AuditLog] Failed to fetch audit logs');
    return [];
  }
}
