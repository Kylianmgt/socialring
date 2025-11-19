'use client';

import { useState } from 'react';

export function DeleteAccountSection() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') {
      setError('Please type the confirmation text exactly as shown');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Redirect to sign out
      window.location.href = '/api/auth/signout';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
          Danger Zone
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Permanently delete your account and all associated data
        </p>
      </div>

      {!showConfirmation ? (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <h3 className="mb-2 font-semibold text-red-900 dark:text-red-200">
              ⚠️ Warning: This action cannot be undone
            </h3>
            <ul className="space-y-1 text-sm text-red-800 dark:text-red-300">
              <li>• Your account will be permanently deleted</li>
              <li>• All connected social media accounts will be disconnected</li>
              <li>• All your posts and data will be removed</li>
              <li>• You will be immediately signed out</li>
              <li>• This action is irreversible</li>
            </ul>
          </div>

          <button
            onClick={() => setShowConfirmation(true)}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-all hover:bg-red-700"
          >
            Delete My Account
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950">
            <p className="mb-3 font-semibold text-red-900 dark:text-red-200">
              Are you absolutely sure?
            </p>
            <p className="mb-4 text-sm text-red-800 dark:text-red-300">
              To confirm, please type{' '}
              <span className="font-mono font-bold">DELETE MY ACCOUNT</span> below:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError(null);
              }}
              placeholder="Type here..."
              className="w-full rounded-lg border-2 border-red-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none dark:border-red-700 dark:bg-gray-900 dark:text-white"
              disabled={isDeleting}
            />
            {error && (
              <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirmation(false);
                setConfirmText('');
                setError(null);
              }}
              disabled={isDeleting}
              className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || confirmText !== 'DELETE MY ACCOUNT'}
              className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
