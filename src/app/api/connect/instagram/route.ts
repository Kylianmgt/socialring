import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { connectedAccounts } from '@/db/schemas';
import { getGroupCredentials } from '@/lib/group-utils';
import { checkRateLimit, createRateLimitedResponse } from '@/lib/rate-limit';
import { getPasswordFromSession } from '@/lib/session-storage';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimit = checkRateLimit(request, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // 10 requests per window
    });

    if (!rateLimit.allowed) {
      return createRateLimitedResponse(rateLimit.resetTime);
    }

    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const groupId = searchParams.get('groupId');

    if (error) {
      const redirectUrl = groupId
        ? `/dashboard/groups/${groupId}?error=${error}`
        : `/dashboard/add-account?error=${error}`;
      return NextResponse.redirect(
        new URL(redirectUrl, request.url)
      );
    }

    if (!code) {
      // Get groupId to retrieve stored credentials
      const finalGroupId = groupId ? parseInt(groupId) : null;

      if (!finalGroupId) {
        return NextResponse.redirect(
          new URL('/dashboard?error=missing_group', request.url)
        );
      }

      // Try to get password from session
      const passwordSessionId = request.cookies.get('_pwd_session')?.value;
      if (!passwordSessionId) {
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}/add-account?error=password_not_validated`, request.url)
        );
      }

      const password = await getPasswordFromSession(passwordSessionId);
      if (!password) {
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}/add-account?error=password_not_validated`, request.url)
        );
      }

      const credentials = await getGroupCredentials(finalGroupId, session.user.id, password, 'instagram');
      if (!credentials) {
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}?error=no_credentials_saved`, request.url)
        );
      }

      const clientId = credentials.clientId;

      // Instagram uses Facebook OAuth
      const facebookAuthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
      facebookAuthUrl.searchParams.set('client_id', clientId);
      facebookAuthUrl.searchParams.set(
        'redirect_uri',
        `${process.env.NEXTAUTH_URL}/api/connect/instagram`
      );
      facebookAuthUrl.searchParams.set(
        'scope',
        'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement'
      );
      const state = groupId ? `${session.user.id}|${groupId}` : session.user.id;
      facebookAuthUrl.searchParams.set('state', state);

      return NextResponse.redirect(facebookAuthUrl.toString());
    }

    // Get groupId from state to retrieve client secret for token exchange
    const state = searchParams.get('state') || '';
    const [, stateGroupId] = state.split('|');
    const finalGroupId = stateGroupId ? parseInt(stateGroupId) : null;
    
    let clientId = '';
    let clientSecret = '';

    if (!finalGroupId) {
      return NextResponse.redirect(
        new URL('/dashboard?error=missing_group', request.url)
      );
    }

    // Try to get credentials from password cookie
    // Try to get password from session
    const passwordSessionId = request.cookies.get('_pwd_session')?.value;
    if (!passwordSessionId) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}/add-account?error=password_not_validated`, request.url)
      );
    }

    const password = await getPasswordFromSession(passwordSessionId);
    if (!password) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}/add-account?error=password_not_validated`, request.url)
      );
    }

    const credentials = await getGroupCredentials(finalGroupId, session.user.id, password, 'instagram');
    if (!credentials) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}?error=no_credentials_saved`, request.url)
      );
    }

    clientId = credentials.clientId;
    clientSecret = credentials.clientSecret;

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('code', code);
    tokenUrl.searchParams.set(
      'redirect_uri',
      `${process.env.NEXTAUTH_URL}/api/connect/instagram`
    );

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get Instagram Business Account
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account,name,access_token&access_token=${tokenData.access_token}`
    );
    const accountsData = await accountsResponse.json();

    if (!accountsData.data || accountsData.data.length === 0) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}/add-account?error=no_instagram_account`, request.url)
      );
    }

    // Find first page with Instagram account
    const pageWithInstagram = accountsData.data.find(
      (page: { instagram_business_account?: { id: string } }) => page.instagram_business_account
    );

    if (!pageWithInstagram) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}/add-account?error=no_instagram_business_account`, request.url)
      );
    }

    const igAccountId = pageWithInstagram.instagram_business_account.id;
    const pageAccessToken = pageWithInstagram.access_token;

    // Get Instagram profile info
    const igProfileResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}?fields=id,username,name,profile_picture_url&access_token=${pageAccessToken}`
    );
    const igProfile = await igProfileResponse.json();

    // Don't log sensitive data
    if (igProfile.username) {
      console.log('[Instagram] Account connected successfully');
    }

    // Use username if available, otherwise use name
    const accountName = igProfile.username || igProfile.name;
    const instagramUrl = igProfile.username 
      ? `https://www.instagram.com/${igProfile.username}/`
      : null;

    // Store in connected_accounts table
    await db.insert(connectedAccounts).values({
      userId: session.user.id,
      groupId: finalGroupId,
      platform: 'instagram',
      accountName: accountName,
      accountId: igAccountId,
      profileUrl: instagramUrl,
      profileImage: igProfile.profile_picture_url || null,
      accessToken: pageAccessToken,
      refreshToken: null,
      expiresAt: null, // Page tokens don't expire
      isPage: 1,
    });

    // Redirect back to add-account page
    return NextResponse.redirect(
      new URL(`/dashboard/groups/${finalGroupId}/add-account?success=instagram`, request.url)
    );
  } catch (error) {
    console.error('Error connecting Instagram account:', error);
    const searchParams = request.nextUrl.searchParams;
    const groupId = searchParams.get('groupId');
    const finalGroupId = groupId ? parseInt(groupId) : null;
    if (!finalGroupId) {
      return NextResponse.redirect(
        new URL('/dashboard?error=connection_failed', request.url)
      );
    }
    return NextResponse.redirect(
      new URL(`/dashboard/groups/${finalGroupId}/add-account?error=connection_failed`, request.url)
    );
  }
}
