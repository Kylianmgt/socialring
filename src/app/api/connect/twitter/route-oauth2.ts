import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGroupCredentials } from '@/lib/group-utils';
import crypto from 'crypto';

// Helper function to generate PKCE code verifier and challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Get groupId and password from URL
    const groupIdParam = searchParams.get('groupId');
    const password = searchParams.get('password');
    
    if (!groupIdParam) {
      return NextResponse.redirect(
        new URL('/dashboard?error=missing_group_id', request.url)
      );
    }

    const groupId = parseInt(groupIdParam);
    if (isNaN(groupId)) {
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_group', request.url)
      );
    }

    if (!password) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${groupId}/add-account?error=missing_password`, request.url)
      );
    }

    // Get decrypted credentials from group
    const credentials = await getGroupCredentials(groupId, session.user.id, password, 'twitter');
    if (!credentials) {
      return NextResponse.redirect(
        new URL(`/dashboard/groups/${groupId}/add-account?error=invalid_password_or_credentials`, request.url)
      );
    }

    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = generatePKCE();
    
    // Store code verifier in state
    const state = `${session.user.id}|${groupId}|${password}|${codeVerifier}`;

    console.log('[Twitter OAuth 2.0] Initiating authorization');
    console.log('[Twitter OAuth 2.0] Client ID:', credentials.clientId);

    // Redirect to X OAuth 2.0 authorization
    const twitterAuthUrl = new URL('https://x.com/i/oauth2/authorize');
    twitterAuthUrl.searchParams.set('response_type', 'code');
    twitterAuthUrl.searchParams.set('client_id', credentials.clientId);
    twitterAuthUrl.searchParams.set(
      'redirect_uri',
      `${process.env.NEXTAUTH_URL}/api/auth/callback/twitter`
    );
    twitterAuthUrl.searchParams.set(
      'scope',
      'tweet.read tweet.write users.read offline.access'
    );
    twitterAuthUrl.searchParams.set('state', state);
    twitterAuthUrl.searchParams.set('code_challenge', codeChallenge);
    twitterAuthUrl.searchParams.set('code_challenge_method', 'S256');

    return NextResponse.redirect(twitterAuthUrl.toString());
  } catch (error) {
    console.error('Error initiating Twitter OAuth:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=oauth_init_failed', request.url)
    );
  }
}
