import { db } from '@/lib/db';
import { groups, connectedAccounts } from '@/db/schemas';
import { eq, and } from 'drizzle-orm';
import type { Group } from '@/types';
import { decrypt } from './encryption';

export async function getGroupsByUserId(userId: string): Promise<Group[]> {
  const userGroups = await db
    .select()
    .from(groups)
    .where(eq(groups.userId, userId))
    .orderBy(groups.createdAt);
  
  return userGroups as Group[];
}

export async function getGroupById(groupId: number, userId: string): Promise<Group | null> {
  const group = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
    .limit(1);
  
  return group.length > 0 ? (group[0] as Group) : null;
}

export async function createGroup(data: {
  userId: string;
  name: string;
  description?: string;
}) {
  return await db.insert(groups).values({
    userId: data.userId,
    name: data.name,
    description: data.description || null,
  }).returning();
}

export async function deleteGroup(groupId: number, userId: string) {
  return await db
    .delete(groups)
    .where(and(eq(groups.id, groupId), eq(groups.userId, userId)));
}

export async function getGroupCredentials(
  groupId: number,
  userId: string,
  password: string,
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'tiktok' | 'discord'
): Promise<{ clientId: string; clientSecret: string } | null> {
  const group = await getGroupById(groupId, userId);
  if (!group) return null;

  const fieldMap = {
    facebook: {
      clientId: group.encryptedFacebookClientId,
      clientSecret: group.encryptedFacebookClientSecret,
    },
    twitter: {
      clientId: group.encryptedTwitterClientId,
      clientSecret: group.encryptedTwitterClientSecret,
    },
    instagram: {
      clientId: group.encryptedInstagramClientId,
      clientSecret: group.encryptedInstagramClientSecret,
    },
    linkedin: {
      clientId: group.encryptedLinkedinClientId,
      clientSecret: group.encryptedLinkedinClientSecret,
    },
    tiktok: {
      clientId: group.encryptedTiktokClientId,
      clientSecret: group.encryptedTiktokClientSecret,
    },
    discord: {
      clientId: group.encryptedDiscordClientId,
      clientSecret: group.encryptedDiscordClientSecret,
    },
  };

  const encryptedData = fieldMap[platform];
  if (!encryptedData.clientId || !encryptedData.clientSecret) {
    return null;
  }

  const clientId = decrypt(encryptedData.clientId, password);
  const clientSecret = decrypt(encryptedData.clientSecret, password);

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

export async function getAccountsByGroupId(groupId: number, userId: string) {
  return await db
    .select()
    .from(connectedAccounts)
    .where(and(eq(connectedAccounts.groupId, groupId), eq(connectedAccounts.userId, userId)));
}

export async function getFacebookPageId(
  groupId: number,
  userId: string,
  password: string
): Promise<string | null> {
  const group = await getGroupById(groupId, userId);
  type GroupWithPageId = Group & { encryptedFacebookPageId?: string | null };
  const encryptedPageId = (group as GroupWithPageId)?.encryptedFacebookPageId;
  if (!group || !encryptedPageId) return null;

  const pageId = decrypt(encryptedPageId, password);
  return pageId || null;
}

export async function getTwitterApiCredentials(
  groupId: number,
  userId: string,
  password: string
): Promise<{ apiKey: string; apiSecret: string } | null> {
  const group = await getGroupById(groupId, userId);
  
  // Access the encrypted Twitter API credentials (OAuth 1.0a Consumer Key/Secret)
  type GroupWithTwitterApi = Group & { 
    encryptedTwitterApiKey?: string | null;
    encryptedTwitterApiSecret?: string | null;
  };
  const groupWithApi = group as GroupWithTwitterApi;
  
  if (!groupWithApi || !groupWithApi.encryptedTwitterApiKey || !groupWithApi.encryptedTwitterApiSecret) {
    return null;
  }

  const apiKey = decrypt(groupWithApi.encryptedTwitterApiKey, password);
  const apiSecret = decrypt(groupWithApi.encryptedTwitterApiSecret, password);

  if (!apiKey || !apiSecret) {
    return null;
  }

  return { apiKey, apiSecret };
}

export async function getLinkedInAccessToken(
  groupId: number,
  userId: string,
  password: string
): Promise<string | null> {
  const group = await getGroupById(groupId, userId);
  
  type GroupWithLinkedInToken = Group & { 
    encryptedLinkedinAccessToken?: string | null;
  };
  const groupWithToken = group as GroupWithLinkedInToken;
  
  if (!groupWithToken || !groupWithToken.encryptedLinkedinAccessToken) {
    return null;
  }

  const accessToken = decrypt(groupWithToken.encryptedLinkedinAccessToken, password);
  return accessToken || null;
}

export async function getLinkedInOrganizationId(
  groupId: number,
  userId: string,
  password: string
): Promise<string | null> {
  const group = await getGroupById(groupId, userId);
  
  type GroupWithOrgId = Group & { 
    encryptedLinkedinOrganizationId?: string | null;
  };
  const groupWithOrgId = group as GroupWithOrgId;
  
  if (!groupWithOrgId || !groupWithOrgId.encryptedLinkedinOrganizationId) {
    return null;
  }

  const orgId = decrypt(groupWithOrgId.encryptedLinkedinOrganizationId, password);
  return orgId || null;
}

export async function getLinkedInGroupId(
  groupId: number,
  userId: string,
  password: string
): Promise<string | null> {
  const group = await getGroupById(groupId, userId);
  
  type GroupWithGroupId = Group & { 
    encryptedLinkedinGroupId?: string | null;
  };
  const groupWithGroupId = group as GroupWithGroupId;
  
  if (!groupWithGroupId || !groupWithGroupId.encryptedLinkedinGroupId) {
    return null;
  }

  const gId = decrypt(groupWithGroupId.encryptedLinkedinGroupId, password);
  return gId || null;
}
