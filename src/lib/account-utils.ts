import { db } from '@/lib/db';
import { connectedAccounts } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import type { ConnectedAccount } from '@/types';

export async function getConnectedAccountsByUserId(userId: string): Promise<ConnectedAccount[]> {
  const accounts = await db
    .select()
    .from(connectedAccounts)
    .where(and(
      eq(connectedAccounts.userId, userId),
      isNotNull(connectedAccounts.accessToken)
    ));
  
  return accounts as ConnectedAccount[];
}

export async function addConnectedAccount(data: {
  userId: string;
  platform: string;
  accountName: string;
  profileUrl?: string | null;
  isPage?: number;
}) {
  return await db.insert(connectedAccounts).values({
    userId: data.userId,
    platform: data.platform,
    accountName: data.accountName,
    profileUrl: data.profileUrl || null,
    isPage: data.isPage || 0,
  });
}
