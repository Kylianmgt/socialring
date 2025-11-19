import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { connectedAccounts } from '@/db/schemas';
import { getGroupCredentials } from '@/lib/group-utils';
import { checkRateLimit, createRateLimitedResponse } from '@/lib/rate-limit';
import { getPasswordFromSession } from '@/lib/session-storage';
import crypto from 'crypto';

// PKCE helper functions
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateCodeChallenge(codeVerifier: string): string {
  return crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

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

    if (!code) {
      // Initial OAuth request - get credentials from form
      const groupId = searchParams.get('groupId');
      const authState = groupId ? `${session.user.id}|${groupId}` : session.user.id;

      // Get groupId to retrieve stored credentials
      const finalGroupId = groupId ? parseInt(groupId) : null;

      if (!finalGroupId) {
        return NextResponse.redirect(
          new URL('/dashboard?error=missing_group', request.url)
        );
      }

      // Try to get credentials from password session
      const passwordSessionId = request.cookies.get('_pwd_session')?.value;
      if (!passwordSessionId) {
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}/add-account?error=password_not_validated`, request.url)
        );
      }

      const password = await getPasswordFromSession(passwordSessionId);
      if (!password) {
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}/add-account?error=password_session_expired`, request.url)
        );
      }

      const credentials = await getGroupCredentials(finalGroupId, session.user.id, password, 'tiktok');
      if (!credentials) {
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}?error=no_credentials_saved`, request.url)
        );
      }

      // Trim credentials in case of whitespace
      const clientKey = (credentials.clientId || '').trim();
      
      if (!clientKey) {
        console.error('[TikTok] Client Key is missing');
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}/add-account?error=invalid_client_key`, request.url)
        );
      }

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      // Log for debugging
      console.log('[TikTok] Authorization request with:', {
        clientKey: clientKey?.substring(0, 10) + '...',
        redirectUri: `${process.env.NEXTAUTH_URL}/api/connect/tiktok/`,
        scope: 'user.info.basic',
      });

      // Redirect to TikTok OAuth 2.0 - using v2 endpoint per official docs
      const tiktokAuthUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
      tiktokAuthUrl.searchParams.set('client_key', clientKey);
      tiktokAuthUrl.searchParams.set('response_type', 'code');
      tiktokAuthUrl.searchParams.set(
        'redirect_uri',
        `${process.env.NEXTAUTH_URL}/api/connect/tiktok/`
      );
      tiktokAuthUrl.searchParams.set('scope', 'user.info.basic,video.upload,video.publish');
      tiktokAuthUrl.searchParams.set('state', authState);
      tiktokAuthUrl.searchParams.set('code_challenge', codeChallenge);
      tiktokAuthUrl.searchParams.set('code_challenge_method', 'S256');

      console.log('[TikTok] Authorization URL:', tiktokAuthUrl.toString().substring(0, 100) + '...');

      // Set cookie on the redirect response to store code verifier
      const finalResponse = NextResponse.redirect(tiktokAuthUrl.toString());
      finalResponse.cookies.set('tiktok_code_verifier', codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
      });

      return finalResponse;
    }

    // Handle callback - exchange code for access token
    const callbackState = searchParams.get('state') || '';
    const [, stateGroupId] = callbackState.split('|');
    const finalGroupId = stateGroupId ? parseInt(stateGroupId) : null;
    
    let clientId = '';
    let clientSecret = '';

    if (!finalGroupId) {
      return NextResponse.redirect(
        new URL('/dashboard?error=missing_group', request.url)
      );
    }

    // Try to get credentials from password session
    const passwordSessionId = request.cookies.get('_pwd_session')?.value;
    if (!passwordSessionId) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}/add-account?error=password_not_validated`, request.url)
      );
    }

    const password = await getPasswordFromSession(passwordSessionId);
    if (!password) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}/add-account?error=password_session_expired`, request.url)
      );
    }

    const credentials = await getGroupCredentials(finalGroupId, session.user.id, password, 'tiktok');
    if (!credentials) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}?error=no_credentials_saved`, request.url)
      );
    }

    clientId = credentials.clientId;
    clientSecret = credentials.clientSecret;

    // Trim credentials in case of whitespace
    clientId = (clientId || '').trim();
    clientSecret = (clientSecret || '').trim();

    if (!clientId || !clientSecret) {
      console.error('[TikTok] Missing client credentials');
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}?error=invalid_credentials`, request.url)
      );
    }
    const codeVerifierCookie = request.cookies.get('tiktok_code_verifier');
    if (!codeVerifierCookie) {
      console.error('[TikTok] No code verifier found in cookies');
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}?error=missing_code_verifier`, request.url)
      );
    }

    const codeVerifier = codeVerifierCookie.value;

    // Exchange code for access token using form-encoded format per TikTok docs
    const params = new URLSearchParams();
    params.append('client_key', clientId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', `${process.env.NEXTAUTH_URL}/api/connect/tiktok/`);
    params.append('code_verifier', codeVerifier);

    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[TikTok] Error exchanging code for token:', tokenData.error_description || tokenData.error);
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}?error=token_exchange_failed`, request.url)
      );
    }

    if (!tokenData.access_token) {
      console.error('[TikTok] No access token in response:', tokenData);
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}?error=no_token_returned`, request.url)
      );
    }

    // Get user info - open_id is in the token response
    const openId = tokenData.open_id;
    if (!openId) {
      console.error('[TikTok] No open_id in token response:', tokenData);
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}?error=no_user_data`, request.url)
      );
    }

    // Fetch user info from TikTok API to get display name and avatar
    let displayName = `TikTok User ${openId}`;
    let avatarUrl: string | null = null;

    try {
      console.log('[TikTok] Fetching user info...');
      const userInfoResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_large_url', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (userInfoResponse.ok) {
        const userInfoData = await userInfoResponse.json();
        if (userInfoData.data?.user) {
          displayName = userInfoData.data.user.display_name || displayName;
          avatarUrl = userInfoData.data.user.avatar_large_url || null;
          console.log('[TikTok] User info fetched:', { displayName, hasAvatar: !!avatarUrl });
        }
      } else {
        console.warn('[TikTok] Failed to fetch user info, using fallback:', userInfoResponse.status);
      }
    } catch (error) {
      console.warn('[TikTok] Error fetching user info, using fallback:', error);
    }

    // Store connected account with user info from TikTok API
    await db.insert(connectedAccounts).values({
      userId: session.user.id,
      groupId: finalGroupId,
      platform: 'tiktok',
      accountName: displayName,
      accountId: openId,
      profileUrl: `https://www.tiktok.com/@${openId}`,
      profileImage: avatarUrl,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null,
    });

    return NextResponse.redirect(
      new URL(`/dashboard/groups/${finalGroupId}?success=tiktok_connected`, request.url)
    );
  } catch (error) {
    console.error('Error connecting TikTok account:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=connection_failed', request.url)
    );
  }
}

