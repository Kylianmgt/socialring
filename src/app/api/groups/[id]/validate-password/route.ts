import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { groups, users } from '@/db/schemas';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { checkRateLimit, createRateLimitedResponse } from '@/lib/rate-limit';
import { storePasswordSession } from '@/lib/session-storage';
import { validatePasswordSchema } from '@/lib/validation-schemas';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting - 5 attempts per 15 minutes
    const rateLimit = checkRateLimit(request, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      keyPrefix: 'group_pwd:',
    });

    if (!rateLimit.allowed) {
      return createRateLimitedResponse(rateLimit.resetTime);
    }

    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const groupId = parseInt(id);

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
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

    // Verify group ownership
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, session.user.id)));

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Validate user's global password
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user || !user.encryptedGlobalPassword) {
      return NextResponse.json({ error: 'Password not configured' }, { status: 400 });
    }

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

    const response = NextResponse.json({ success: true });
    response.cookies.set(`group_${groupId}_session`, sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 3600,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to validate password' },
      { status: 500 }
    );
  }
}

