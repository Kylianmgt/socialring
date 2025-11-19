import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { posts } from '@/db/schema';

export async function GET() {
  try {
    const items = await db.select().from(posts).limit(50);
    return NextResponse.json({ data: items });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, groupId, caption, mediaUrls, mediaTypes } = body;
    if (!userId || !groupId) {
      return NextResponse.json({ error: 'userId and groupId required' }, { status: 400 });
    }

    const [created] = await db.insert(posts).values({ 
      userId, 
      groupId, 
      caption,
      mediaUrls,
      mediaTypes,
      status: 'draft'
    }).returning();
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
