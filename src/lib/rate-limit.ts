/**
 * Rate limiting middleware
 * Prevents brute force attacks on sensitive endpoints
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Simple in-memory rate limit store (use Redis in production)
const rateLimitStore: RateLimitStore = {};

// Clean up old entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  }
}, 15 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Optional prefix for different endpoints
}

/**
 * Rate limiting middleware
 * @param request - NextRequest object
 * @param config - Rate limiting configuration
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  // Get client IP
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-client-ip') ||
    'unknown';

  // Create rate limit key with optional prefix
  const prefix = config.keyPrefix || '';
  const key = `${prefix}${ip}:${request.nextUrl.pathname}`;

  // Current time
  const now = Date.now();

  // Initialize or get entry
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: rateLimitStore[key].resetTime,
    };
  }

  const entry = rateLimitStore[key];

  // Check if window has expired
  if (now > entry.resetTime) {
    // Reset counter
    entry.count = 1;
    entry.resetTime = now + config.windowMs;
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Create a rate limited response
 */
export function createRateLimitedResponse(resetTime: number): NextResponse {
  const resetDate = new Date(resetTime);
  return new NextResponse(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Reset': resetDate.toISOString(),
      },
    }
  );
}
