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
    const groupId = searchParams.get('groupId'); // Get groupId from URL

    if (error) {
      if (!groupId) {
        return NextResponse.redirect(
          new URL('/dashboard?error=' + error, request.url)
        );
      }
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${groupId}/add-account?error=${error}`, request.url)
      );
    }

    if (!code) {
      // Get groupId to retrieve stored credentials
      const finalGroupId = groupId ? parseInt(groupId) : null;
      let clientId = '';
      let clientSecret = '';

      if (!finalGroupId) {
        return NextResponse.redirect(
          new URL('/dashboard?error=missing_group', request.url)
        );
      }

      // Try to get password from session
      const passwordSessionId = request.cookies.get('_pwd_session')?.value;
      console.log('[Facebook OAuth] Cookies:', request.cookies.getAll());
      console.log('[Facebook OAuth] _pwd_session:', passwordSessionId);
      
      if (!passwordSessionId) {
        console.log('[Facebook OAuth] No password session found, redirecting with error');
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}/add-account?error=password_not_validated`, request.url)
        );
      }

      const password = await getPasswordFromSession(passwordSessionId);
      console.log('[Facebook OAuth] Password from session:', password ? 'Found' : 'Not found');
      
      if (!password) {
        console.log('[Facebook OAuth] Password not found in session, redirecting with error');
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}/add-account?error=password_not_validated`, request.url)
        );
      }

      const credentials = await getGroupCredentials(finalGroupId, session.user.id, password, 'facebook');
      if (!credentials) {
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}?error=no_credentials_saved`, request.url)
        );
      }

      clientId = credentials.clientId;
      clientSecret = credentials.clientSecret;

      const facebookAuthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
      facebookAuthUrl.searchParams.set('client_id', clientId);
      facebookAuthUrl.searchParams.set(
        'redirect_uri',
        `${process.env.NEXTAUTH_URL}/api/connect/facebook`
      );
      facebookAuthUrl.searchParams.set(
        'scope',
        'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish'
      );
      // Store groupId in state if provided
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

    const credentials = await getGroupCredentials(finalGroupId, session.user.id, password, 'facebook');
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
      `${process.env.NEXTAUTH_URL}/api/connect/facebook`
    );

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get long-lived token (60 days)
    const longLivedTokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedTokenUrl.searchParams.set('client_id', clientId);
    longLivedTokenUrl.searchParams.set('client_secret', clientSecret);
    longLivedTokenUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

    const longLivedResponse = await fetch(longLivedTokenUrl.toString());
    const longLivedData = await longLivedResponse.json();

    const accessToken = longLivedData.access_token || tokenData.access_token;

    // Fetch all Facebook Pages the user manages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();

    // Store each page as a separate connected account with profile picture
    if (pagesData.data && Array.isArray(pagesData.data)) {
      for (const page of pagesData.data) {
        // Fetch page profile picture
        const pagePictureResponse = await fetch(
          `https://graph.facebook.com/v18.0/${page.id}/picture?type=large&redirect=false&access_token=${page.access_token}`
        );
        const pagePictureData = await pagePictureResponse.json();
        
        if (pagePictureData.data?.url) {
          // Page picture retrieved successfully
        }
        
        await db.insert(connectedAccounts).values({
          userId: session.user.id,
          groupId: finalGroupId,
          platform: 'facebook',
          accountName: page.name,
          accountId: page.id,
          profileUrl: `https://facebook.com/${page.id}`,
          profileImage: pagePictureData.data?.url || null,
          accessToken: page.access_token, // Page-specific access token (doesn't expire)
          refreshToken: null,
          expiresAt: null, // Page tokens don't expire
          isPage: 1,
        });
      }
    }

    // Redirect back to add-account page
    return NextResponse.redirect(
      new URL(`/dashboard/groups/${finalGroupId}/add-account?success=facebook`, request.url)
    );
  } catch (error) {
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
