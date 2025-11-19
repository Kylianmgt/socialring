'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function ErrorBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const success = searchParams.get('success');

  useEffect(() => {
    if (success) {
      const successMessages: Record<string, string> = {
        instagram: '✓ Instagram account connected successfully!',
        facebook: '✓ Facebook pages connected successfully!',
        twitter: '✓ Twitter account connected successfully!',
        linkedin: '✓ LinkedIn account connected successfully!',
        tiktok: '✓ TikTok account connected successfully!',
      };

      const message = successMessages[success] || '✓ Connection successful!';
      toast.success(message);

      // Remove success from URL after showing toast
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('success');
      const newUrl = newSearchParams.toString()
        ? `?${newSearchParams.toString()}`
        : window.location.pathname;
      router.replace(newUrl);
      return;
    }

    if (!error) return;

    const errorMessages: Record<string, string> = {
      missing_group_id: 'Group ID is missing',
      invalid_group: 'Invalid group',
      missing_password: 'Password is required to connect this platform',
      invalid_password_or_credentials: 'Invalid password. Please make sure you entered the correct group password.',
      password_not_validated: 'Password not validated. Please validate your password first.',
      discord_not_implemented: 'Discord integration is not yet implemented',
      connection_failed: 'Failed to connect account. Please try again.',
      missing_credentials: 'Missing credentials',
      auth_denied: 'Authorization was denied. Please try again.',
      missing_state: 'Invalid request state. Please try again.',
      state_expired: 'Request expired. Please try again.',
      threads_not_available: 'Threads integration is not yet available',
      no_instagram_account: 'No Instagram account found. Please check your account.',
      no_instagram_business_account: 'Only Instagram Business accounts are supported',
      oauth_failed: 'OAuth connection failed. Please try again.',
      invalid_credentials: 'Invalid credentials. Please check your API settings.',
      password_session_expired: 'Password session expired. Please validate again.',
      invalid_user: 'Invalid user session. Please sign in again.',
      missing_params: 'Missing required parameters.',
    };

    const message = errorMessages[error] || 'An error occurred. Please try again.';
    toast.error(message);

    // Remove error from URL after showing toast
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('error');
    const newUrl = newSearchParams.toString()
      ? `?${newSearchParams.toString()}`
      : window.location.pathname;
    router.replace(newUrl);
  }, [error, success, searchParams, router]);

  return null;
}
