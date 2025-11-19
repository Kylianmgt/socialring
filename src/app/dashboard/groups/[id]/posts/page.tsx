import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getGroupById } from '@/lib/group-utils';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { PostsList } from '@/components/dashboard/PostsList';
import { db } from '@/lib/db';
import { posts, connectedAccounts } from '@/db/schemas';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';

export default async function PostsListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const { id } = await params;
  const groupId = parseInt(id);

  if (isNaN(groupId)) {
    redirect('/dashboard');
  }

  // Get group
  const group = await getGroupById(groupId, session.user.id);
  
  if (!group) {
    redirect('/dashboard');
  }

  // Get posts for this group
  const groupPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.groupId, groupId))
    .orderBy(desc(posts.createdAt));

  // Get connected accounts with profile images for this group
  const accounts = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.groupId, groupId));

  // Create platform profiles map (platform -> profileImage)
  const platformProfiles: Record<string, string | null> = {};
  accounts.forEach(account => {
    platformProfiles[account.platform] = account.profileImage;
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-purple-950 to-gray-950">
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      
      <div className="relative">
        <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Post History - {group.name}</h1>
              <div className="flex gap-3">
                <Link
                  href={`/dashboard/groups/${groupId}/create-post`}
                  className="flex items-center gap-2 rounded-xl bg-linear-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Post
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="rounded-xl border border-white/10 bg-gray-800/50 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-purple-500/50 hover:bg-gray-800"
                >
                  Settings
                </Link>
                <SignOutButton />
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Link
            href={`/dashboard/groups/${groupId}`}
            className="mb-6 inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {group.name}
          </Link>
          <PostsList groupId={groupId} posts={groupPosts} platformProfiles={platformProfiles} />
        </main>
      </div>
    </div>
  );
}
