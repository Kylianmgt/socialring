import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/db/schemas';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { checkRateLimit, createRateLimitedResponse } from '@/lib/rate-limit';
import { storePasswordSession } from '@/lib/session-storage';
import { validatePasswordSchema } from '@/lib/validation-schemas';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting - 5 attempts per 15 minutes
    const rateLimit = checkRateLimit(request, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      keyPrefix: 'validate_pwd:',
    });

    if (!rateLimit.allowed) {
      return createRateLimitedResponse(rateLimit.resetTime);
    }

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validation = validatePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid password format' },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Get user's encrypted password marker
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
      .then((result) => result[0]);

    if (!user || !user.encryptedGlobalPassword) {
      return NextResponse.json({ error: 'Password not set' }, { status: 400 });
    }

    // Attempt to decrypt with provided password
    try {
      const decrypted = decrypt(user.encryptedGlobalPassword, password);
      if (decrypted !== 'valid') {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Password is valid - store in secure session instead of cookie
    const sessionId = await storePasswordSession(password, 3600);
    
    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set('_pwd_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to allow cookie on same-site redirects
      maxAge: 3600, // 1 hour
      path: '/',
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to validate password' },
      { status: 500 }
    );
  }
}

