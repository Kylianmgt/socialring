'use client';

import type { Session } from 'next-auth';
import type { ConnectedAccount, User } from '@/types';
import { useState } from 'react';

interface UserDataSectionProps {
  user: User;
  connectedAccounts: ConnectedAccount[];
  session: Session;
}

export function UserDataSection({ user, connectedAccounts, session }: UserDataSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const userData = {
    userId: user.id,
    name: session.user?.name || 'N/A',
    email: session.user?.email || 'N/A',
    emailVerified: user.emailVerified ? new Date(user.emailVerified).toLocaleString() : 'Not verified',
    createdAt: user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A',
    connectedAccountsCount: connectedAccounts.length,
    connectedAccounts: connectedAccounts.map(account => ({
      id: account.id,
      platform: account.platform,
      accountName: account.accountName,
      accountId: account.accountId,
      profileUrl: account.profileUrl,
      isPage: account.isPage === 1 ? 'Yes' : 'No',
      connectedAt: account.created_at ? new Date(account.created_at).toLocaleString() : 'N/A',
    })),
  };

  const downloadData = () => {
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `socialring-user-data-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Data
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and download all your personal data
          </p>
        </div>
        <button
          onClick={downloadData}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-purple-700"
        >
          Download Data
        </button>
      </div>

      <div className="space-y-4">
        {/* Basic Info */}
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Account Information
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">User ID:</span>
              <span className="font-mono text-sm text-gray-900 dark:text-white">
                {userData.userId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Name:</span>
              <span className="text-gray-900 dark:text-white">{userData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Email:</span>
              <span className="text-gray-900 dark:text-white">{userData.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Email Verified:</span>
              <span className="text-gray-900 dark:text-white">{userData.emailVerified}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Account Created:</span>
              <span className="text-gray-900 dark:text-white">{userData.createdAt}</span>
            </div>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Connected Accounts ({userData.connectedAccountsCount})
            </h3>
            {userData.connectedAccountsCount > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                {isExpanded ? 'Hide' : 'Show'} Details
              </button>
            )}
          </div>

          {isExpanded && userData.connectedAccountsCount > 0 && (
            <div className="space-y-3">
              {userData.connectedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-md bg-gray-50 p-3 dark:bg-gray-700"
                >
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                      <span className="font-medium capitalize text-gray-900 dark:text-white">
                        {account.platform}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Account Name:</span>
                      <span className="text-gray-900 dark:text-white">{account.accountName}</span>
                    </div>
                    {account.accountId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Account ID:</span>
                        <span className="font-mono text-xs text-gray-900 dark:text-white">
                          {account.accountId}
                        </span>
                      </div>
                    )}
                    {account.profileUrl && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Profile URL:</span>
                        <a
                          href={account.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
                        >
                          View Profile
                        </a>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Is Page:</span>
                      <span className="text-gray-900 dark:text-white">{account.isPage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Connected:</span>
                      <span className="text-gray-900 dark:text-white">{account.connectedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {userData.connectedAccountsCount === 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No connected accounts yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
