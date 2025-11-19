import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, pageId, accessToken } = await request.json();

    if (!pageId || !accessToken || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: pageId, accessToken, message' },
        { status: 400 }
      );
    }

    // Post to Facebook page
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          access_token: accessToken,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || 'Failed to post to Facebook' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      postId: data.id,
      message: 'Post created successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to post to Facebook' },
      { status: 500 }
    );
  }
}
