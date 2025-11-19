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
    const { platform, clientId, clientSecret, password, pageId, consumerKey, consumerSecret, linkedinCompanyId, linkedinGroupId } = body;

    if (!platform || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For Twitter, require all 4 credentials
    if (platform === 'twitter') {
      if (!clientId || !clientSecret || !consumerKey || !consumerSecret) {
        return NextResponse.json(
          { error: 'Twitter requires Client ID, Client Secret, Consumer Key, and Consumer Secret' },
          { status: 400 }
        );
      }
    } else {
      // Check for required credentials for other platforms
      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: 'Client ID and Secret are required' },
          { status: 400 }
        );
      }
    }

    // Verify group ownership
    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, session.user.id)));

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Encrypt credentials
    const encryptedClientId = encrypt(clientId, password);
    const encryptedClientSecret = encrypt(clientSecret, password);

    // Prepare update data based on platform
    const updateData: Record<string, string> = {};

    switch (platform) {
      case 'facebook':
        updateData.encryptedFacebookClientId = encryptedClientId;
        updateData.encryptedFacebookClientSecret = encryptedClientSecret;
        if (pageId) {
          updateData.encryptedFacebookPageId = encrypt(pageId, password);
        }
        break;
      case 'instagram':
        updateData.encryptedInstagramClientId = encryptedClientId;
        updateData.encryptedInstagramClientSecret = encryptedClientSecret;
        break;
      case 'twitter':
        updateData.encryptedTwitterClientId = encryptedClientId;
        updateData.encryptedTwitterClientSecret = encryptedClientSecret;
        // Also save OAuth 1.0a credentials for media uploads
        if (consumerKey && consumerSecret) {
          updateData.encryptedTwitterApiKey = encrypt(consumerKey, password);
          updateData.encryptedTwitterApiSecret = encrypt(consumerSecret, password);
        }
        break;
      case 'linkedin':
        updateData.encryptedLinkedinClientId = encryptedClientId;
        updateData.encryptedLinkedinClientSecret = encryptedClientSecret;
        if (linkedinCompanyId) {
          updateData.encryptedLinkedinOrganizationId = encrypt(linkedinCompanyId, password);
        }
        if (linkedinGroupId) {
          updateData.encryptedLinkedinGroupId = encrypt(linkedinGroupId, password);
        }
        break;
      case 'tiktok':
        updateData.encryptedTiktokClientId = encryptedClientId;
        updateData.encryptedTiktokClientSecret = encryptedClientSecret;
        break;
      case 'discord':
        updateData.encryptedDiscordClientId = encryptedClientId;
        updateData.encryptedDiscordClientSecret = encryptedClientSecret;
        break;
      case 'threads':
        updateData.encryptedThreadsClientId = encryptedClientId;
        updateData.encryptedThreadsClientSecret = encryptedClientSecret;
        break;
      default:
        return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Update the group with encrypted credentials
    await db
      .update(groups)
      .set(updateData)
      .where(eq(groups.id, groupId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save credentials' },
      { status: 500 }
    );
  }
}
