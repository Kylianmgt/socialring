import Link from 'next/link';
import type { ConnectedAccount } from '@/types';
import { PLATFORM_CONFIG } from '@/lib/constants';
import { ConnectedAccountCard } from './ConnectedAccountCard';

interface ConnectedAccountsListProps {
  accounts: ConnectedAccount[];
}

export function ConnectedAccountsList({ accounts }: ConnectedAccountsListProps) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50 p-12 text-center dark:border-purple-700 dark:bg-purple-950">
        <div className="mx-auto max-w-md">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-purple-100 p-4 dark:bg-purple-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-purple-600 dark:text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            No Connected Accounts
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Connect your social media accounts to start managing your content across all platforms
          </p>
          <Link
            href="/dashboard/add-account"
            className="inline-block rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-all hover:bg-purple-700"
          >
            Connect Your First Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => {
        const platform = PLATFORM_CONFIG[account.platform];
        if (!platform) return null;

        return (
          <ConnectedAccountCard
            key={account.id}
            account={account}
            platformName={platform.name}
            platformIconPath={platform.iconPath}
            platformViewBox={platform.viewBox}
            platformColor={platform.color}
          />
        );
      })}
    </div>
  );
}

export function ConnectedAccountsSection({ accounts }: ConnectedAccountsListProps) {
  return (
    <ConnectedAccountsList accounts={accounts} />
  );
}
