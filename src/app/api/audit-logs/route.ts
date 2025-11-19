import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserAuditLogs } from '@/lib/audit-logging';

/**
 * Get audit logs for the current user or a specific user (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requesting logs for another user (would need admin role in future)
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const targetUserId = searchParams.get('userId');

    // Validate limit parameter
    let limit = 50;
    if (limitParam) {
      try {
        const parsed = parseInt(limitParam, 10);
        if (parsed > 0 && parsed <= 500) {
          limit = parsed;
        }
      } catch {
        // Use default limit
      }
    }

    // Users can only view their own logs (admin check would go here)
    const userId = targetUserId || session.user.id;

    // For now, only allow users to view their own logs
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only view your own audit logs' },
        { status: 403 }
      );
    }

    const logs = await getUserAuditLogs(userId, limit);

    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
