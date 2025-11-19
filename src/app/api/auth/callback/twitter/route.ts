// This file is now active as route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect to the connect endpoint with all query parameters
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Build redirect URL to connect endpoint
  const connectUrl = new URL('/api/connect/twitter', request.url);
  
  if (code) connectUrl.searchParams.set('code', code);
  if (state) connectUrl.searchParams.set('state', state);
  if (error) connectUrl.searchParams.set('error', error);

  return NextResponse.redirect(connectUrl);
}
