import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/db/schemas';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/encryption';
import { setPasswordSchema, validateRequest } from '@/lib/validation-schemas';
import { logPasswordChange } from '@/lib/audit-logging';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate password strength
    const validation = validateRequest(setPasswordSchema, body);
    if (!validation.valid) {
      // Log failed password change attempt
      await logPasswordChange(session.user.id, request, false);
      
      return NextResponse.json(
        { error: 'Invalid password', errors: validation.errors },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Encrypt password marker for validation
    const encryptedGlobalPassword = encrypt('valid', password);

    // Update user with encrypted global password
    await db
      .update(users)
      .set({ encryptedGlobalPassword })
      .where(eq(users.id, session.user.id));

    // Log successful password change
    await logPasswordChange(session.user.id, request, true);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}
