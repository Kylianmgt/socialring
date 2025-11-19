import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/auth/linkedin-token
 * Returns a LinkedIn app-level access token for testing/development
 * Generated using Client ID and Client Secret credentials
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get app-level access token using Client Credentials flow
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
      console.error('Failed to get LinkedIn access token:', data);
      return NextResponse.json({ 
        error: 'Failed to generate access token',
        details: data
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      note: 'This is an app-level token. For user-specific operations, use the user OAuth token from account connections.'
    });
  } catch (error) {
    console.error('Error generating LinkedIn token:', error);
    return NextResponse.json(
      { error: 'Failed to generate LinkedIn access token' },
      { status: 500 }
    );
  }
}
