'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { ConnectedAccount } from '@/types';
import { PasswordVerificationModal } from './PasswordVerificationModal';

interface CreatePostFormProps {
  groupId: number;
  accounts: ConnectedAccount[];
}

export function CreatePostForm({ groupId, accounts }: CreatePostFormProps) {
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreview, setMediaPreview] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Suppress hydration mismatch warnings from browser extensions
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('did not match') || args[0].includes('Hydration'))
      ) {
        return;
      }
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + mediaFiles.length > 10) {
      toast.error('Maximum 10 media files allowed');
      return;
    }

    setMediaFiles(prev => [...prev, ...files]);
    
    // Generate previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!caption.trim() && mediaFiles.length === 0) {
      toast.error('Please add caption or media');
      return;
    }

    // Show password verification modal instead of using prompt()
    setShowPasswordModal(true);
  };

  const handlePasswordVerification = async (password: string) => {
    setIsPosting(true);

    try {
      // Validate global password
      const passwordValidationResponse = await fetch('/api/user/validate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!passwordValidationResponse.ok) {
        const errorData = await passwordValidationResponse.json();
        throw new Error(errorData.error || 'Invalid password');
      }

      const formData = new FormData();
      formData.append('groupId', groupId.toString());
      formData.append('caption', caption);
      mediaFiles.forEach(file => {
        formData.append('media', file);
      });

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Show detailed error from the API
        const errorMessage = result.error || result.message || 'Failed to create post';
        const errorDetails = result.details ? ` Details: ${result.details}` : '';
        toast.error(`${errorMessage}${errorDetails}`, {
          duration: 10000, // Show for 10 seconds
        });
        setIsPosting(false);
        return;
      }
      
      // Check if all platforms succeeded
      const platformResults = result.platformResults || {};
      const failedPlatforms = Object.entries(platformResults)
        .filter(([, r]) => !(r as { success: boolean }).success)
        .map(([key]) => key.split('-')[0]);
      
      if (failedPlatforms.length === 0) {
        toast.success('Post created and published to all platforms successfully!');
      } else if (failedPlatforms.length === Object.keys(platformResults).length) {
        // All platforms failed - show detailed errors
        const platformErrors = Object.entries(platformResults)
          .map(([key, r]) => {
            const result = r as { success: boolean; error?: string };
            return `${key.split('-')[0]}: ${result.error || 'Unknown error'}`;
          })
          .join('\n');
        toast.error(`Post created but failed to publish to any platform:\n${platformErrors}`, {
          duration: 15000, // Show for 15 seconds
        });
      } else {
        // Some platforms succeeded
        const successPlatforms = Object.entries(platformResults)
          .filter(([, r]) => (r as { success: boolean }).success)
          .map(([key]) => key.split('-')[0]);
        const failedDetails = Object.entries(platformResults)
          .filter(([, r]) => !(r as { success: boolean }).success)
          .map(([key, r]) => {
            const result = r as { success: boolean; error?: string };
            return `${key.split('-')[0]}: ${result.error || 'Unknown error'}`;
          })
          .join('\n');
        
        toast.warning(`Post published to: ${successPlatforms.join(', ')}\n\nFailed platforms:\n${failedDetails}`, {
          duration: 15000, // Show for 15 seconds
        });
      }
      
      setCaption('');
      setMediaFiles([]);
      setMediaPreview([]);
      setShowPasswordModal(false);
      
      // Refresh the page after successful posting
      if (failedPlatforms.length < Object.keys(platformResults).length) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsPosting(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-600 dark:bg-gray-800/50">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          No accounts connected
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Connect social media accounts to this group before creating posts.
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Create New Post</h3>

      {/* Caption */}
      <div className="mb-4">
        <label htmlFor="caption" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Caption
        </label>
        <textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
          placeholder="Write your caption here..."
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {caption.length} characters
        </p>
      </div>

      {/* Media Upload */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Media (Images/Videos)
        </label>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-3 transition-colors hover:border-purple-500 hover:bg-purple-50 dark:border-gray-600 dark:bg-gray-700/50 dark:hover:border-purple-500 dark:hover:bg-purple-900/20">
            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Media</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaChange}
              className="hidden"
              disabled={isPosting}
            />
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Max 10 files (Images and Videos)
          </p>
        </div>
      </div>

      {/* Media Preview */}
      {mediaPreview.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {mediaPreview.map((preview, index) => (
            <div key={`preview-${index}-${preview.substring(0, 20)}`} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              {mediaFiles[index]?.type.startsWith('video/') ? (
                <video src={preview} className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeMedia(index)}
                className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
                {mediaFiles[index]?.type.startsWith('video/') ? 'Video' : 'Image'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Target Platforms */}
      <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Will post to {accounts.length} account{accounts.length !== 1 ? 's' : ''}:
        </p>
        <div className="flex flex-wrap gap-2">
          {accounts.map(account => (
            <span
              key={account.id}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-300"
            >
              <span className="capitalize">{account.platform}</span>
              <span className="text-gray-400">•</span>
              <span>{account.accountName}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPosting || (!caption.trim() && mediaFiles.length === 0)}
        className="w-full rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPosting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Posting...
          </span>
        ) : (
          'Create Post'
        )}
      </button>
    </form>

    <PasswordVerificationModal
      isOpen={showPasswordModal}
      onSubmit={handlePasswordVerification}
      onCancel={() => setShowPasswordModal(false)}
      isLoading={isPosting}
    />
    </>
  );
}
