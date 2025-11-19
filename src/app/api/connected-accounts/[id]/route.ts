import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { connectedAccounts } from '@/db/schemas';
import { eq, and } from 'drizzle-orm';
import { logAccountDisconnected } from '@/lib/audit-logging';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const accountId = parseInt(id, 10);

    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    // Get account details before deletion for audit log
    const account = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.id, accountId),
          eq(connectedAccounts.userId, session.user.id)
        )
      )
      .limit(1);

    // Delete the connected account (only if it belongs to the user)
    await db
      .delete(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.id, accountId),
          eq(connectedAccounts.userId, session.user.id)
        )
      );

    // Log account disconnection
    if (account.length > 0) {
      await logAccountDisconnected(
        session.user.id,
        request,
        account[0].platform,
        account[0].id.toString()
      );
    }

    return NextResponse.json(
      { message: 'Account disconnected successfully' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}
