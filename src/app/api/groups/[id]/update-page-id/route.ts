import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { groups } from '@/db/schemas';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '@/lib/encryption';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { facebookPageId, password } = body;

    if (!facebookPageId || !password) {
      return NextResponse.json(
        { error: 'Facebook Page ID and password are required' },
        { status: 400 }
      );
    }

    // Encrypt the Facebook Page ID
    const encryptedPageId = encrypt(facebookPageId, password);

    // Update the group
    const result = await db
      .update(groups)
      .set({
        encryptedFacebookPageId: encryptedPageId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(groups.id, groupId), eq(groups.userId, session.user.id))
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Group not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Facebook Page ID updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update Facebook Page ID' },
      { status: 500 }
    );
  }
}
