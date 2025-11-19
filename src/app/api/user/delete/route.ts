import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, sessions, connectedAccounts } from '@/db/schemas';
import { eq } from 'drizzle-orm';

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Delete in order to respect foreign key constraints
    // 1. Delete connected accounts
    await db.delete(connectedAccounts).where(eq(connectedAccounts.userId, userId));

    // 2. Delete sessions
    await db.delete(sessions).where(eq(sessions.userId, userId));

    // 3. Delete user
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
