// This file is now active as route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { connectedAccounts } from '@/db/schemas';
import { getGroupCredentials } from '@/lib/group-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state') || '';
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/add-account?error=${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?error=no_authorization_code', request.url)
      );
    }

    // Extract credentials from state
    const [, stateGroupId, password, codeVerifier] = state.split('|');
    const groupId = stateGroupId ? parseInt(stateGroupId) : null;

    if (!groupId || !password || !codeVerifier) {
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_state', request.url)
      );
    }

    // Get decrypted credentials from group
    const credentials = await getGroupCredentials(groupId, session.user.id, password, 'twitter');
    if (!credentials) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${groupId}/add-account?error=invalid_password_or_credentials`, request.url)
      );
    }

    console.log('[Twitter OAuth 2.0] Exchanging code for token');
    console.log('[Twitter OAuth 2.0] Client ID:', credentials.clientId);
    console.log('[Twitter OAuth 2.0] Client Secret length:', credentials.clientSecret.length);

    // X OAuth 2.0 for Web Apps (confidential clients) requires Basic Auth
    const basicAuth = Buffer.from(
      `${credentials.clientId}:${credentials.clientSecret}`
    ).toString('base64');

    console.log('[Twitter OAuth 2.0] Basic Auth header:', `Basic ${basicAuth}`);

    const tokenRequestBody = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/twitter`,
      code_verifier: codeVerifier,
    });

    console.log('[Twitter OAuth 2.0] Request body:', tokenRequestBody.toString());

    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: tokenRequestBody,
    });

    const tokenData = await tokenResponse.json();
    
    console.log('[Twitter OAuth 2.0] Token response status:', tokenResponse.status);
    console.log('[Twitter OAuth 2.0] Token response:', JSON.stringify(tokenData, null, 2));

    if (!tokenData.access_token) {
      console.error('[Twitter OAuth 2.0] Token exchange failed:', tokenData);
      const errorMsg = tokenData.error_description || tokenData.error || 'token_exchange_failed';
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${groupId}/add-account?error=${encodeURIComponent(errorMsg)}`, request.url)
      );
    }

    // Get user profile
    const profileResponse = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const profileData = await profileResponse.json();

    console.log('[Twitter OAuth 2.0] Profile response:', JSON.stringify(profileData, null, 2));

    if (!profileData.data) {
      console.error('[Twitter OAuth 2.0] Failed to get user profile:', profileData);
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${groupId}/add-account?error=profile_fetch_failed`, request.url)
      );
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    // Store in connected_accounts table
    await db.insert(connectedAccounts).values({
      userId: session.user.id,
      groupId: groupId,
      platform: 'twitter',
      accountName: profileData.data.username,
      accountId: profileData.data.id,
      profileUrl: `https://x.com/${profileData.data.username}`,
      profileImage: profileData.data.profile_image_url || null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: expiresAt,
      isPage: 0,
    });

    console.log('[Twitter OAuth 2.0] Successfully connected account:', profileData.data.username);

    // Redirect back to group page
    return NextResponse.redirect(
      new URL(`/dashboard/groups/${groupId}?success=twitter`, request.url)
    );
  } catch (error) {
    console.error('Error connecting Twitter account:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=connection_failed', request.url)
    );
  }
}
