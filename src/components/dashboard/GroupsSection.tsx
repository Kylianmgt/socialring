'use client';

import { useState } from 'react';
import type { Group, ConnectedAccount } from '@/types';
import { GroupCard } from './GroupCard';
import { CreateGroupModal } from './CreateGroupModal';

interface GroupsSectionProps {
  groups: Group[];
  accountsByGroup: Map<number, ConnectedAccount[]>;
}

export function GroupsSection({ groups, accountsByGroup }: GroupsSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white">
          Your Groups
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-linear-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50"
        >
          <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <svg className="relative h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="relative">Create Group</span>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-gray-900/90 to-gray-800/90 p-16 text-center backdrop-blur-xl">
          <div className="absolute -inset-px rounded-3xl bg-linear-to-r from-purple-600 to-blue-600 opacity-0 blur transition-opacity duration-500 group-hover:opacity-20" />
          
          <div className="relative mx-auto max-w-md">
            <div className="mb-6 flex justify-center">
              <div className="rounded-2xl bg-linear-to-br from-purple-600 to-blue-600 p-6 shadow-2xl">
                <svg
                  className="h-16 w-16 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="mb-3 text-2xl font-bold text-white">
              No Groups Yet
            </h3>
            <p className="mb-8 text-gray-400">
              Create groups to organize your social media accounts. Each group can have its own API credentials and posting strategy.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-purple-600 to-blue-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Group
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-1">
          {groups.map((group, index) => (
            <div
              key={group.id}
              className="animate-in fade-in slide-in-from-bottom-8 duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <GroupCard
                group={group}
                accounts={accountsByGroup.get(group.id) || []}
              />
            </div>
          ))}
        </div>
      )}

      {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
