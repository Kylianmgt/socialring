'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SetupPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration errors by only rendering after client mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error('Password is required');
      return;
    }

    // ✅ UPDATED: Match server-side password requirements (12+ chars + complexity)
    if (password.length < 12) {
      toast.error('Password must be at least 12 characters');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast.error('Password must contain an uppercase letter (A-Z)');
      return;
    }

    if (!/[a-z]/.test(password)) {
      toast.error('Password must contain a lowercase letter (a-z)');
      return;
    }

    if (!/[0-9]/.test(password)) {
      toast.error('Password must contain a number (0-9)');
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      toast.error('Password must contain a special character (!@#$%^&* etc.)');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set password');
      }

      toast.success('Password set successfully!');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set password');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-950 via-purple-950 to-gray-950 px-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      
      {!isMounted ? null : (
        <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="absolute -inset-1 rounded-3xl bg-linear-to-r from-purple-600 to-blue-600 opacity-30 blur-2xl" />
          
          <div className="relative space-y-8 rounded-3xl border border-white/10 bg-gray-900/90 p-10 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-purple-500 to-blue-600 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-white">
              Set Your Global Password
            </h1>
            <p className="mt-3 text-base text-gray-400">
              This password is required to access your groups and add accounts. Keep it safe!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Global Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="12+ chars: uppercase, lowercase, number, special"
                className="w-full rounded-lg border-2 border-gray-700 bg-gray-800 px-4 py-3 text-white transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                12+ characters, with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-lg border-2 border-gray-700 bg-gray-800 px-4 py-3 text-white transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20"
                disabled={isSubmitting}
              />
            </div>

            <div className="rounded-xl border-2 border-blue-200/20 bg-linear-to-br from-blue-50 to-cyan-50 p-4 dark:border-blue-800/30 dark:from-blue-900/20 dark:to-cyan-900/20">
              <div className="flex gap-3">
                <svg className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-200">Important</p>
                  <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
                    You will need this password every time you access groups or add accounts. If you forget it, you won&apos;t be able to access your encrypted credentials.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full justify-center overflow-hidden rounded-xl bg-linear-to-r from-purple-600 to-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">
                {isSubmitting ? 'Setting Password...' : 'Set Password'}
              </span>
            </button>
          </form>
          </div>
        </div>
      )}
    </div>
  );
}
