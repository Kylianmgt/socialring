import { db } from '@/lib/db';
import { connectedAccounts } from '@/db/schemas';
import { eq, and } from 'drizzle-orm';

/**
 * Get access token for a specific platform and user
 */
export async function getAccessToken(userId: string, platform: string, accountId?: string) {
  const conditions = [
    eq(connectedAccounts.userId, userId),
    eq(connectedAccounts.platform, platform),
  ];

  if (accountId) {
    conditions.push(eq(connectedAccounts.accountId, accountId));
  }

  const accounts = await db
    .select()
    .from(connectedAccounts)
    .where(and(...conditions))
    .limit(1);

  if (accounts.length === 0) {
    return null;
  }

  const account = accounts[0];

  // Check if token is expired
  if (account.expiresAt && account.expiresAt < new Date()) {
    // Token expired - need to refresh
    if (account.refreshToken) {
      return await refreshAccessToken(account);
    }
    return null;
  }

  return account.accessToken;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(
  account: typeof connectedAccounts.$inferSelect,
  groupId?: number,
  userId?: string,
  password?: string
) {
  if (!account.refreshToken) {
    return null;
  }

  try {
    let tokenUrl: string;
    let body: Record<string, string>;
    let clientId = '';
    let clientSecret = '';

    switch (account.platform) {
      case 'twitter':
        // Try to get credentials from group if provided
        if (groupId && userId && password) {
          const { getGroupCredentials } = await import('@/lib/group-utils');
          const credentials = await getGroupCredentials(groupId, userId, password, 'twitter');
          if (credentials) {
            clientId = credentials.clientId;
            clientSecret = credentials.clientSecret;
          }
        }
        
        // Fall back to environment variables
        if (!clientId || !clientSecret) {
          clientId = process.env.TWITTER_CLIENT_ID || '';
          clientSecret = process.env.TWITTER_CLIENT_SECRET || '';
        }

        tokenUrl = 'https://api.x.com/2/oauth2/token';
        body = {
          refresh_token: account.refreshToken,
          grant_type: 'refresh_token',
          client_id: clientId,
        };
        break;

      // Add other platforms as needed
      default:
        return null;
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams(body),
    });

    const data = await response.json();

    if (!data.access_token) {
      return null;
    }

    // Update token in database
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

    await db
      .update(connectedAccounts)
      .set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || account.refreshToken,
        expiresAt: expiresAt,
        updated_at: new Date(),
      })
      .where(eq(connectedAccounts.id, account.id));

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Facebook Graph API helper
 */
export async function facebookGraphAPI(
  userId: string,
  endpoint: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
) {
  const accessToken = await getAccessToken(userId, 'facebook');
  
  if (!accessToken) {
    throw new Error('No Facebook access token found');
  }

  const url = new URL(`https://graph.facebook.com/v18.0/${endpoint}`);
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

/**
 * Instagram Graph API helper
 */
export async function instagramGraphAPI(
  userId: string,
  endpoint: string,
  accountId?: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
) {
  const accessToken = await getAccessToken(userId, 'instagram', accountId);
  
  if (!accessToken) {
    throw new Error('No Instagram access token found');
  }

  const url = new URL(`https://graph.facebook.com/v18.0/${endpoint}`);
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

/**
 * Twitter API helper
 */
export async function twitterAPI(
  userId: string,
  endpoint: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
) {
  const accessToken = await getAccessToken(userId, 'twitter');
  
  if (!accessToken) {
    throw new Error('No Twitter access token found');
  }

  const url = `https://api.x.com/2/${endpoint}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

/**
 * LinkedIn API helper
 */
export async function linkedinAPI(
  userId: string,
  endpoint: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
) {
  const accessToken = await getAccessToken(userId, 'linkedin');
  
  if (!accessToken) {
    throw new Error('No LinkedIn access token found');
  }

  const url = `https://api.linkedin.com/v2/${endpoint}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

/**
 * Get LinkedIn app-level access token using Client Credentials
 * This is used for testing and development
 */
export async function getLinkedInAppAccessToken() {
  try {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      }),
    });

    const data = await response.json();

    if (!data.access_token) {
      console.error('Failed to get LinkedIn app access token:', data);
      return null;
    }

    return data.access_token;
  } catch (error) {
    console.error('Error getting LinkedIn app token:', error);
    return null;
  }
}
