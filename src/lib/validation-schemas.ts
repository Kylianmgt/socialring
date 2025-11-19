/**
 * Request validation schemas
 * Centralized Zod schemas for request parameter validation
 */

import { z } from 'zod';

// Common schemas
export const idParamSchema = z.coerce
  .number()
  .int()
  .positive('ID must be a positive integer');

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    'Password must contain special character'
  );

// Groups
export const groupIdSchema = z.object({
  groupId: idParamSchema,
});

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(255, 'Group name is too long')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description is too long')
    .trim()
    .optional(),
});

export const updateGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(255, 'Group name is too long')
    .trim()
    .optional(),
  description: z
    .string()
    .max(1000, 'Description is too long')
    .trim()
    .optional(),
});

// Posts
export const postIdSchema = z.object({
  postId: idParamSchema,
});

export const createPostSchema = z.object({
  caption: z
    .string()
    .max(5000, 'Caption is too long')
    .trim()
    .optional()
    .default(''),
  groupId: idParamSchema,
  platforms: z
    .array(z.string())
    .min(1, 'At least one platform must be selected'),
  mediaUrls: z
    .array(z.string().url('Invalid media URL'))
    .optional()
    .default([]),
});

// Connected Accounts
export const connectedAccountIdSchema = z.object({
  id: idParamSchema,
});

// Password
export const setPasswordSchema = z.object({
  password: passwordSchema,
});

export const validatePasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .max(256, 'Password is too long (max 256 characters)')
    .refine(
      (p) => /^[\x20-\x7E]*$/.test(p),
      'Password contains invalid characters'
    ),
});

// User
export const deleteUserSchema = z.object({
  confirmation: z
    .string()
    .refine(
      (val) => val === 'DELETE',
      'Must type DELETE to confirm user deletion'
    ),
});

// Helper function to safely parse and handle validation errors
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { valid: true; data: T } | { valid: false; errors: Record<string, string> } {
  try {
    const parsed = schema.parse(data);
    return { valid: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      (error as z.ZodError).issues.forEach((err: z.ZodIssue) => {
        const path = err.path.join('.');
        errors[path || '_error'] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { _error: 'Validation failed' } };
  }
}
