import crypto from 'crypto';
import { encrypt, decrypt } from '@/lib/encryption';

/**
 * In-memory session storage for sensitive data like passwords
 * This replaces storing plaintext passwords in cookies
 * 
 * In production, this should be replaced with Redis or similar
 */

interface SessionData {
  data: string;
  expiresAt: number;
}

class SessionStorage {
  private storage: Map<string, SessionData> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-cleanup expired sessions every 5 minutes
    this.startCleanup();
  }

  /**
   * Generate a secure session ID
   */
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store encrypted data in session
   * @param sessionId - Unique session identifier
   * @param data - Data to store (will be encrypted)
   * @param ttlSeconds - Time to live in seconds (default: 3600 = 1 hour)
   */
  async set(sessionId: string, data: string, ttlSeconds: number = 3600): Promise<void> {
    // Encrypt the data
    const encryptedData = encrypt(data, sessionId);

    // Store with expiration
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.storage.set(sessionId, {
      data: encryptedData,
      expiresAt,
    });
  }

  /**
   * Retrieve and decrypt data from session
   * @param sessionId - Session identifier
   * @returns Decrypted data or null if not found/expired
   */
  async get(sessionId: string): Promise<string | null> {
    const session = this.storage.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if expired
    if (Date.now() > session.expiresAt) {
      this.storage.delete(sessionId);
      return null;
    }

    try {
      // Decrypt the data
      const decrypted = decrypt(session.data, sessionId);
      return decrypted;
    } catch {
      // If decryption fails, delete the corrupted session
      this.storage.delete(sessionId);
      return null;
    }
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    this.storage.delete(sessionId);
  }

  /**
   * Check if session exists and is valid
   */
  async exists(sessionId: string): Promise<boolean> {
    const data = await this.get(sessionId);
    return data !== null;
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.storage.entries()) {
      if (now > session.expiresAt) {
        this.storage.delete(sessionId);
      }
    }
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Stop cleanup (for testing/shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get storage statistics (for monitoring)
   */
  getStats(): { activeSessions: number; expiredCheckedAt: string } {
    return {
      activeSessions: this.storage.size,
      expiredCheckedAt: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const sessionStorage = new SessionStorage();

/**
 * Store password in secure session
 * @returns Session ID to be stored in cookie
 */
export async function storePasswordSession(
  password: string,
  ttlSeconds: number = 3600
): Promise<string> {
  const sessionId = sessionStorage.generateSessionId();
  await sessionStorage.set(sessionId, password, ttlSeconds);
  return sessionId;
}

/**
 * Retrieve password from secure session
 */
export async function getPasswordFromSession(sessionId: string): Promise<string | null> {
  if (!sessionId) {
    return null;
  }
  return await sessionStorage.get(sessionId);
}

/**
 * Delete password session
 */
export async function deletePasswordSession(sessionId: string): Promise<void> {
  await sessionStorage.delete(sessionId);
}

/**
 * Store OAuth state data in secure session
 * Stores state information without exposing sensitive data in URL/cookie
 */
export async function storeOAuthState(
  userId: string,
  groupId: number,
  password: string,
  additionalData?: Record<string, string>
): Promise<string> {
  const stateData = JSON.stringify({
    userId,
    groupId,
    password,
    ...additionalData,
    timestamp: Date.now(),
  });

  const sessionId = sessionStorage.generateSessionId();
  await sessionStorage.set(sessionId, stateData, 600); // 10 minutes for OAuth
  return sessionId;
}

/**
 * Retrieve OAuth state data
 */
export async function getOAuthState(
  sessionId: string
): Promise<{
  userId: string;
  groupId: number;
  password: string;
  [key: string]: string | number;
} | null> {
  if (!sessionId) {
    return null;
  }

  const data = await sessionStorage.get(sessionId);
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Delete OAuth state
 */
export async function deleteOAuthState(sessionId: string): Promise<void> {
  await sessionStorage.delete(sessionId);
}
