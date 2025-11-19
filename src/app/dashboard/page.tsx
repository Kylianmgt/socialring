import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserById } from '@/lib/user-utils';
import { getConnectedAccountsByUserId } from '@/lib/account-utils';
import { getGroupsByUserId } from '@/lib/group-utils';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { UserProfileHeader } from '@/components/dashboard/UserProfileHeader';
import { GroupsSection } from '@/components/dashboard/GroupsSection';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Get user data to check if global password is set
  const user = await getUserById(session.user.id);

  // If no global password set, redirect to setup
  if (!user?.encryptedGlobalPassword) {
    redirect('/dashboard/setup-password');
  }

  // Get groups and their accounts
  const groups = await getGroupsByUserId(session.user.id);
  
  // Get accounts for each group
  const accountsByGroup = new Map<number, Awaited<ReturnType<typeof getConnectedAccountsByUserId>>>();
  for (const group of groups) {
    const accounts = await getConnectedAccountsByUserId(session.user.id);
    const groupAccounts = accounts.filter(a => a.groupId === group.id);
    accountsByGroup.set(group.id, groupAccounts);
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-purple-950 to-gray-950">
      {/* Animated background pattern */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      
      <div className="relative">
        {/* Header */}
        <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-purple-500 to-blue-600">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-white">
                  SocialRing
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/settings"
                  className="group rounded-xl border border-white/10 bg-gray-800/50 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-purple-500/50 hover:bg-gray-800"
                >
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </span>
                </Link>
                <SignOutButton />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <UserProfileHeader 
              userName={session.user.name || 'User'}
              userImage={session.user.image}
            />

            <GroupsSection groups={groups} accountsByGroup={accountsByGroup} />
          </div>
        </main>
      </div>
    </div>
  );
}
