import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const groupId = request.nextUrl.searchParams.get('groupId');
    const finalGroupId = groupId ? parseInt(groupId) : null;

    if (!finalGroupId) {
      return NextResponse.redirect(
        new URL('/dashboard?error=discord_not_implemented', request.url)
      );
    }

    // Discord OAuth implementation placeholder
    return NextResponse.redirect(
      new URL(`/dashboard/groups/${finalGroupId}/add-account?error=discord_not_implemented`, request.url)
    );
  } catch (error) {
    console.error('Error connecting Discord account:', error);
    const groupId = request.nextUrl.searchParams.get('groupId');
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
