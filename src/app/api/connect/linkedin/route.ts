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

    if (error) {
      // Extract groupId from state if it was passed
      const state = searchParams.get('state') || '';
      const [, stateGroupId] = state.split('|');
      const cleanGroupId = stateGroupId ? stateGroupId.split('?')[0] : '';
      const finalGroupId = cleanGroupId ? parseInt(cleanGroupId) : null;
      
      if (!finalGroupId) {
        return NextResponse.redirect(
          new URL(`/dashboard?error=${error}`, request.url)
        );
      }
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}/add-account?error=${error}`, request.url)
      );
    }

    if (!code) {
      // Get groupId from URL if provided
      const groupId = searchParams.get('groupId');
      const state = groupId ? `${session.user.id}|${groupId}` : session.user.id;

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

      const credentials = await getGroupCredentials(finalGroupId, session.user.id, password, 'linkedin');
      if (!credentials) {
        return NextResponse.redirect(
          new URL(`/dashboard/groups/${finalGroupId}?error=no_credentials_saved`, request.url)
        );
      }

      clientId = credentials.clientId;
      clientSecret = credentials.clientSecret;

      // Redirect to LinkedIn OAuth 2.0
      const linkedinAuthUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      linkedinAuthUrl.searchParams.set('response_type', 'code');
      linkedinAuthUrl.searchParams.set('client_id', clientId);
      linkedinAuthUrl.searchParams.set(
        'redirect_uri',
        `${process.env.NEXTAUTH_URL}/api/connect/linkedin`
      );
      // Only request personal profile permissions
      // Organization posting requires LinkedIn Marketing Partner approval
      linkedinAuthUrl.searchParams.set('scope', 'openid profile email w_member_social');
      linkedinAuthUrl.searchParams.set('state', state);

      return NextResponse.redirect(linkedinAuthUrl.toString());
    }

    // Get groupId from state to retrieve client secret for token exchange
    const state = searchParams.get('state') || '';
    const [, stateGroupId] = state.split('|');
    const cleanGroupId = stateGroupId ? stateGroupId.split('?')[0] : '';
    const finalGroupId = cleanGroupId ? parseInt(cleanGroupId) : null;
    
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

    const credentials = await getGroupCredentials(finalGroupId, session.user.id, password, 'linkedin');
    if (!credentials) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${finalGroupId}?error=no_credentials_saved`, request.url)
      );
    }

    clientId = credentials.clientId;
    clientSecret = credentials.clientSecret;

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/connect/linkedin`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Try to get page/organization information
    let profileData: any = { sub: 'unknown' };
    let accountName = 'LinkedIn Page';
    let profileImage = null;
    let pageData: any[] = [];
    
    try {
      // First, get user info to identify the user
      const userinfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      
      const userinfoJson = await userinfoResponse.json();
      console.log('[LinkedIn Connect] Userinfo response:', JSON.stringify(userinfoJson, null, 2));
      
      if (userinfoResponse.ok && userinfoJson.sub) {
        profileData = userinfoJson;
        accountName = userinfoJson.name || `${userinfoJson.given_name || ''} ${userinfoJson.family_name || ''}`.trim() || 'LinkedIn User';
        if (userinfoJson.picture) {
          profileImage = userinfoJson.picture;
        }
        console.log('[LinkedIn Connect] Successfully retrieved user info:', accountName);
      } else {
        console.warn('[LinkedIn Connect] Userinfo request failed:', userinfoJson);
        throw new Error(`Userinfo request failed: ${JSON.stringify(userinfoJson)}`);
      }
      
      console.log('[LinkedIn Connect] Successfully retrieved profile information');
    } catch (profileError) {
      console.error('[LinkedIn Connect] Error fetching profile:', profileError);
      throw profileError; // Re-throw to be caught by outer try-catch
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    // Generate a unique account ID if we couldn't fetch it from LinkedIn
    const accountId = profileData?.sub || `linkedin_${Date.now()}`;
    const profileUrl = profileData?.sub ? `https://linkedin.com/in/${profileData.sub}` : null;

    // Store in connected_accounts table (personal profile only)
    await db.insert(connectedAccounts).values({
      userId: session.user.id,
      groupId: finalGroupId,
      platform: 'linkedin',
      accountName: accountName,
      accountId: profileData?.sub || `linkedin_${Date.now()}`,
      profileUrl: profileData?.sub ? `https://linkedin.com/in/${profileData.sub}` : null,
      profileImage: profileImage,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: expiresAt,
      isPage: 0, // Personal profile
    });

    // Redirect back to add-account page
    return NextResponse.redirect(
      new URL(`/dashboard/groups/${finalGroupId}/add-account?success=linkedin`, request.url)
    );
  } catch (error) {
    console.error('Error connecting LinkedIn account:', error);
    
    // Try to extract groupId even in error state
    const searchParams = request.nextUrl.searchParams;
    const state2 = searchParams.get('state') || '';
    const [, stateGroupId2] = state2.split('|');
    const cleanGroupId2 = stateGroupId2 ? stateGroupId2.split('?')[0] : '';
    const finalGroupId2 = cleanGroupId2 ? parseInt(cleanGroupId2) : null;
    
    if (!finalGroupId2) {
      const errorMessage = error instanceof Error ? error.message : 'connection_failed';
      return NextResponse.redirect(
        new URL(`/dashboard?error=${errorMessage}`, request.url)
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'connection_failed';
    return NextResponse.redirect(
      new URL(`/dashboard/groups/${finalGroupId2}/add-account?error=${errorMessage}`, request.url)
    );
  }
}
