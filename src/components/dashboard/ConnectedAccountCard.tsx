'use client';

import type { ConnectedAccount } from '@/types';
import { useState } from 'react';
import Image from 'next/image';

interface ConnectedAccountCardProps {
  account: ConnectedAccount;
  platformName: string;
  platformIconPath: string;
  platformViewBox: string;
  platformColor: string;
}

export function ConnectedAccountCard({
  account,
  platformName,
  platformIconPath,
  platformViewBox,
  platformColor,
}: ConnectedAccountCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${account.accountName}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/connected-accounts/${account.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to disconnect account');
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      alert('Failed to disconnect account');
      setIsDeleting(false);
    }
  };

  const connectedDate = account.created_at 
    ? new Date(account.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : null;

  return (
    <div className="group relative flex flex-col rounded-2xl border border-white/10 bg-linear-to-br from-gray-900/90 to-gray-800/90 p-5 backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          {account.profileImage ? (
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-linear-to-r from-purple-500 to-blue-500 opacity-0 blur-xl transition-opacity group-hover:opacity-50" />
              <Image
                src={account.profileImage}
                alt={account.accountName}
                width={56}
                height={56}
                unoptimized
                className="relative h-14 w-14 shrink-0 rounded-full border-2 border-white/10 object-cover transition-transform group-hover:scale-105"
              />
            </div>
          ) : (
            <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${platformColor} text-white shadow-lg`}>
              <div className="absolute inset-0 rounded-full bg-linear-to-r from-purple-500 to-blue-500 opacity-0 blur-xl transition-opacity group-hover:opacity-50" />
              <svg className="relative h-7 w-7" fill="currentColor" viewBox={platformViewBox}>
                <path d={platformIconPath} />
              </svg>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <h4 className="text-lg font-semibold text-white">
              {platformName}
            </h4>
            <p className="text-sm text-gray-400 line-clamp-3 whitespace-normal">
              {account.accountName}
            </p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isDeleting}
          className="rounded-xl border border-white/10 bg-gray-800/50 p-3 text-gray-400 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          title="Delete account"
        >
          {isDeleting ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          {account.isPage === 1 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Page
            </span>
          )}
          {connectedDate && (
            <span className="text-xs text-gray-500">
              Connected {connectedDate}
            </span>
          )}
        </div>
        {account.profileUrl && (
          <a
            href={account.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link flex items-center gap-1 text-sm font-semibold text-purple-400 transition-colors hover:text-purple-300"
          >
            View Profile
            <svg className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
