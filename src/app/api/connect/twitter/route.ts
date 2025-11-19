import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { connectedAccounts } from '@/db/schemas';
import { getTwitterApiCredentials } from '@/lib/group-utils';
import { TwitterApi } from 'twitter-api-v2';
import { checkRateLimit, createRateLimitedResponse } from '@/lib/rate-limit';
import { storeOAuthState, getOAuthState, deleteOAuthState, getPasswordFromSession } from '@/lib/session-storage';

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
    const oauth_token = searchParams.get('oauth_token');
    const oauth_verifier = searchParams.get('oauth_verifier');
    const denied = searchParams.get('denied');

    if (denied) {
      const groupIdParam = searchParams.get('groupId');
      if (groupIdParam) {
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${groupIdParam}/add-account?error=auth_denied`, request.url)
        );
      }
      return NextResponse.redirect(
        new URL('/dashboard?error=auth_denied', request.url)
      );
    }

    // Callback from Twitter (OAuth 1.0a)
    if (oauth_token && oauth_verifier) {
      // Retrieve state from session
      const stateSessionId = request.cookies.get('twitter_oauth_state')?.value;
      if (!stateSessionId) {
        const groupIdParam = searchParams.get('groupId');
        const redirectUrl = groupIdParam
          ? `/dashboard/groups/${groupIdParam}/add-account?error=missing_state`
          : '/dashboard?error=missing_state';
        return NextResponse.redirect(
          new URL(redirectUrl, request.url)
        );
      }

      const oauthState = await getOAuthState(stateSessionId);
      if (!oauthState) {
        const groupIdParam = searchParams.get('groupId');
        const redirectUrl = groupIdParam
          ? `/dashboard/groups/${groupIdParam}/add-account?error=state_expired`
          : '/dashboard?error=state_expired';
        return NextResponse.redirect(
          new URL(redirectUrl, request.url)
        );
      }

      const { userId, groupId, password } = oauthState;
      const oauth_token_secret = oauthState.oauth_token_secret as string;

      if (userId !== session.user.id) {
        const redirectUrl = groupId
          ? `/dashboard/groups/${groupId}/add-account?error=invalid_user`
          : '/dashboard?error=invalid_user';
        return NextResponse.redirect(
          new URL(redirectUrl, request.url)
        );
      }

      // Get group credentials (OAuth 1.0a Consumer Key/Secret)
      const credentials = await getTwitterApiCredentials(
        parseInt(groupId as unknown as string),
        session.user.id,
        password as string
      );

      if (!credentials) {
        const redirectUrl = groupId
          ? `/dashboard/groups/${groupId}/add-account?error=invalid_credentials`
          : '/dashboard?error=invalid_credentials';
        return NextResponse.redirect(
          new URL(redirectUrl, request.url)
        );
      }

      // Exchange for access token using twitter-api-v2
      const client = new TwitterApi({
        appKey: credentials.apiKey,
        appSecret: credentials.apiSecret,
        accessToken: oauth_token,
        accessSecret: oauth_token_secret,
      });

      const { client: loggedClient, accessToken, accessSecret } = await client.login(oauth_verifier);

      // Get user profile with profile picture
      const user = await loggedClient.v2.me({
        'user.fields': ['profile_image_url', 'username', 'id']
      });

      // Extract profile image URL (Twitter provides URL, convert to HTTPS if needed)
      let profileImageUrl = null;
      if (user.data.profile_image_url) {
        // Twitter returns HTTP URLs, convert to HTTPS
        profileImageUrl = user.data.profile_image_url.replace('http://', 'https://');
        // Remove the '_normal' suffix if present to get larger version
        profileImageUrl = profileImageUrl.replace('_normal', '');
      }

      // Store in connected_accounts table
      await db.insert(connectedAccounts).values({
        userId: session.user.id,
        groupId: parseInt(groupId as unknown as string),
        platform: 'twitter',
        accountName: `@${user.data.username}`,
        accountId: user.data.id,
        profileUrl: `https://twitter.com/${user.data.username}`,
        profileImage: profileImageUrl,
        accessToken: accessToken,           // OAuth 1.0a access token
        refreshToken: accessSecret,         // OAuth 1.0a access secret
        expiresAt: null,                    // OAuth 1.0a tokens don't expire
        isPage: 0,
      });

      // Clear state session
      await deleteOAuthState(stateSessionId);
      const response = NextResponse.redirect(
        new URL(`/dashboard/groups/${groupId}/add-account?success=twitter`, request.url)
      );
      response.cookies.delete('twitter_oauth_state');

      return response;
    }

    // Start OAuth 1.0a flow
    const groupIdParam = searchParams.get('groupId');

    if (!groupIdParam) {
      return NextResponse.redirect(
        new URL('/dashboard?error=missing_params', request.url)
      );
    }

    const groupId = parseInt(groupIdParam);

    // Retrieve password from session - it was set by /api/user/validate-password
    const passwordSessionId = request.cookies.get('_pwd_session')?.value;
    if (!passwordSessionId) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${groupId}/add-account?error=password_not_validated`, request.url)
      );
    }

    const password = await getPasswordFromSession(passwordSessionId);
    if (!password) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${groupId}/add-account?error=password_session_expired`, request.url)
      );
    }
    
    // Get group credentials (OAuth 1.0a Consumer Key/Secret)
    const credentials = await getTwitterApiCredentials(groupId, session.user.id, password);

    if (!credentials) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${groupId}/add-account?error=invalid_credentials`, request.url)
      );
    }

    // Generate OAuth 1.0a request token
    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/connect/twitter`;
    
    const client = new TwitterApi({
      appKey: credentials.apiKey,
      appSecret: credentials.apiSecret,
    });

    const authLink = await client.generateAuthLink(callbackUrl);

    // Store state in server-side session instead of cookie
    const stateSessionId = await storeOAuthState(
      session.user.id,
      groupId,
      password,
      { oauth_token_secret: authLink.oauth_token_secret }
    );
    
    // Redirect to authorization URL
    const response = NextResponse.redirect(authLink.url);
    response.cookies.set('twitter_oauth_state', stateSessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    const searchParams = request.nextUrl.searchParams;
    const groupIdParam = searchParams.get('groupId');
    const redirectUrl = groupIdParam
      ? `/dashboard/groups/${groupIdParam}/add-account?error=oauth_failed`
      : '/dashboard?error=oauth_failed';
    return NextResponse.redirect(
      new URL(redirectUrl, request.url)
    );
  }
}
