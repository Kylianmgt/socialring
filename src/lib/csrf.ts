/**
 * CSRF Protection Utilities
 * Implements double-submit cookie pattern and token validation
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Token storage (in production, use Redis or database)
const tokenStore = new Map<string, { token: string; expiresAt: number }>();

// Clean up expired tokens every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expiresAt < now) {
      tokenStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

/**
 * Generate a CSRF token
 * @param sessionId - Unique session identifier
 * @returns CSRF token
 */
export function generateCsrfToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  tokenStore.set(sessionId, { token, expiresAt });

  return token;
}

/**
 * Validate CSRF token
 * @param sessionId - Unique session identifier
 * @param token - Token to validate
 * @returns true if valid, false otherwise
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = tokenStore.get(sessionId);

  if (!stored) {
    return false;
  }

  const now = Date.now();

  // Check expiration
  if (stored.expiresAt < now) {
    tokenStore.delete(sessionId);
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(token)
  );
}

/**
 * Extract CSRF token from request
 * Tries multiple sources: header, body, query params
 */
export function extractCsrfToken(request: NextRequest): string | null {
  // Try header first (preferred for modern SPAs)
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) return headerToken;

  // Try custom header variant
  const altHeaderToken = request.headers.get('x-xsrf-token');
  if (altHeaderToken) return altHeaderToken;

  // Try URL search params
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('csrf_token');
  if (queryToken) return queryToken;

  return null;
}

/**
 * Get client IP address for rate limiting CSRF validation attempts
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-client-ip') ||
    'unknown'
  );
}

/**
 * CSRF protection middleware for state-changing operations
 * Use on POST, PUT, DELETE, PATCH requests
 */
export function csrfProtectionMiddleware(
  allowedMethods: string[] = ['POST', 'PUT', 'DELETE', 'PATCH']
) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Only check state-changing methods
    if (!allowedMethods.includes(request.method)) {
      return null;
    }

    // Skip CSRF check for GET requests and specific paths
    if (request.nextUrl.pathname.startsWith('/api/public/')) {
      return null;
    }

    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
      return new NextResponse(
        JSON.stringify({
          error: 'No session found. Please log in.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const token = extractCsrfToken(request);
    if (!token) {
      return new NextResponse(
        JSON.stringify({
          error: 'CSRF token is required for state-changing requests',
          code: 'MISSING_CSRF_TOKEN',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!validateCsrfToken(sessionId, token)) {
      console.warn(
        `[CSRF] Invalid token from ${getClientIp(request)} for session ${sessionId.substring(0, 10)}...`
      );
      return new NextResponse(
        JSON.stringify({
          error: 'Invalid or expired CSRF token',
          code: 'INVALID_CSRF_TOKEN',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Token is valid, continue
    return null;
  };
}

/**
 * Add CSRF token to response cookies
 */
export function addCsrfTokenToResponse(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set('csrf-token', token, {
    httpOnly: false, // Must be readable by JS for SPA
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  });

  return response;
}
