import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getGroupById, getAccountsByGroupId } from '@/lib/group-utils';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { ConnectedAccountsSection } from '@/components/dashboard/ConnectedAccountsSection';
import Link from 'next/link';

export default async function GroupDetailPage({
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

  // Get group and accounts
  const group = await getGroupById(groupId, session.user.id);
  
  if (!group) {
    redirect('/dashboard');
  }

  const accounts = await getAccountsByGroupId(groupId, session.user.id);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-purple-950 to-gray-950">
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      
      <div className="relative">
        <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{group.name}</h1>
                {group.description && <p className="mt-1 text-gray-400">{group.description}</p>}
              </div>
              <div className="flex gap-3">
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
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          {/* Connected Accounts */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-linear-to-br from-gray-900/90 to-gray-800/90 p-8 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Connected Accounts</h3>
              <Link
                href={`/dashboard/groups/${groupId}/add-account`}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-105"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Account
              </Link>
            </div>
            {accounts.length > 0 ? (
              <ConnectedAccountsSection accounts={accounts} />
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-gray-900/30 p-12 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-purple-500/20 to-blue-500/20">
                  <svg
                    className="h-10 w-10 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  No accounts connected
                </h3>
                <p className="mt-2 text-gray-400">
                  Connect your social media accounts to this group to start posting.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex gap-4">
            <Link
              href={`/dashboard/groups/${groupId}/create-post`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-green-600 to-emerald-600 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:scale-105"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Post
            </Link>
            <Link
              href={`/dashboard/groups/${groupId}/posts`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-cyan-600 px-6 py-4 font-semibold text-white shadow-lg transition-all hover:scale-105"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View All Posts
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
