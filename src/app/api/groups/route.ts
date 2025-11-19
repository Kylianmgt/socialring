import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createGroup, getGroupsByUserId } from '@/lib/group-utils';
import { createGroupSchema, validateRequest } from '@/lib/validation-schemas';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validation = validateRequest(createGroupSchema, body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid request parameters', errors: validation.errors },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    const group = await createGroup({
      userId: session.user.id,
      name,
      description,
    });

    return NextResponse.json({ success: true, group: group[0] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groups = await getGroupsByUserId(session.user.id);

    return NextResponse.json({ groups });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}
