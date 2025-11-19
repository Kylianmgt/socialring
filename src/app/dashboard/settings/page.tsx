import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserById } from '@/lib/user-utils';
import { getConnectedAccountsByUserId } from '@/lib/account-utils';
import { UserDataSection, DeleteAccountSection } from '@/components';
import Link from 'next/link';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const user = await getUserById(session.user.id!);
  const connectedAccounts = await getConnectedAccountsByUserId(session.user.id!);

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-purple-950 to-gray-950">
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      
      <div className="relative">
        <header className="border-b border-white/10 bg-gray-900/50 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Settings</h1>
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
          <div className="mx-auto max-w-4xl space-y-6">
            <UserDataSection
              user={user}
              connectedAccounts={connectedAccounts}
              session={session}
            />
            <DeleteAccountSection />
          </div>
        </main>
      </div>
    </div>
  );
}
