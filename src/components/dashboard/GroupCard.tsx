'use client';

import { useState } from 'react';
import type { Group, ConnectedAccount } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { getPlatformInfo } from '@/lib/constants';

interface GroupCardProps {
  group: Group;
  accounts: ConnectedAccount[];
}

export function GroupCard({ group, accounts }: GroupCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${group.name}"? All connected accounts in this group will also be removed.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete group');
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
      setIsDeleting(false);
    }
  };

  const platformCounts = accounts.reduce((acc, account) => {
    acc[account.platform] = (acc[account.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-gray-900/90 to-gray-800/90 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:shadow-purple-500/20">
      {/* Hover glow effect */}
      <div className="absolute -inset-px rounded-2xl bg-linear-to-r from-purple-600 to-blue-600 opacity-0 blur transition-opacity duration-500 group-hover:opacity-10" />
      
      <div className="relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Group Info */}
          <div className="flex-1 space-y-2">
            <h3 className="text-2xl font-bold text-white">
              {group.name}
            </h3>
            {group.description && (
              <p className="text-gray-400">
                {group.description}
              </p>
            )}
          </div>

          {/* Middle: Stats */}
          <div className="flex gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/10 px-6 py-4 backdrop-blur-sm">
              <svg className="h-8 w-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-purple-300">Accounts</p>
                <p className="text-2xl font-bold text-white">{accounts.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-6 py-4 backdrop-blur-sm">
              <svg className="h-8 w-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <div>
                <p className="text-xs font-medium text-blue-300">Platforms</p>
                <p className="text-2xl font-bold text-white">{Object.keys(platformCounts).length}</p>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/groups/${group.id}`}
              className="group/btn relative flex items-center gap-2 overflow-hidden rounded-xl bg-linear-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50"
            >
              <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
              <span className="relative">{accounts.length > 0 ? 'Manage' : 'Add Accounts'}</span>
              <svg className="relative h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
              title="Delete group"
            >
              {isDeleting ? (
                <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Bottom: Connected Account Images */}
        {accounts.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-gray-400">Connected Accounts:</p>
              <div className="flex -space-x-3 overflow-hidden">
                {accounts.slice(0, 8).map((account) => {
                  const platformInfo = getPlatformInfo(account.platform);
                  return account.profileImage ? (
                    <Image
                      key={account.id}
                      src={account.profileImage}
                      alt={account.accountName}
                      width={44}
                      height={44}
                      unoptimized
                      className="inline-block h-11 w-11 rounded-full border-2 border-gray-900 object-cover ring-2 ring-purple-500/30 transition-transform hover:z-10 hover:scale-110"
                      title={`${account.accountName} (${platformInfo.name})`}
                    />
                  ) : (
                    <div
                      key={account.id}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-900 ${platformInfo.color} ring-2 ring-purple-500/30 transition-transform hover:z-10 hover:scale-110`}
                      title={`${account.accountName} (${platformInfo.name})`}
                    >
                      <svg className="h-6 w-6 text-white" fill="currentColor" viewBox={platformInfo.viewBox}>
                        <path d={platformInfo.iconPath} />
                      </svg>
                    </div>
                  );
                })}
                {accounts.length > 8 && (
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-900 bg-linear-to-br from-purple-600 to-blue-600 text-sm font-bold text-white ring-2 ring-purple-500/30">
                    +{accounts.length - 8}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
