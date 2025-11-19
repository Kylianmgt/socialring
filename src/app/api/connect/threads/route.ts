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
        new URL('/dashboard?error=threads_not_available', request.url)
      );
    }

    // Threads API is not yet publicly available
    // This is a placeholder for future implementation
    return NextResponse.redirect(
      new URL(`/dashboard/groups/${finalGroupId}/add-account?error=threads_not_available`, request.url)
    );
  } catch (error) {
    console.error('Error connecting Threads account:', error);
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
