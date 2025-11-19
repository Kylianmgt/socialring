'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Post {
  id: number;
  caption: string | null;
  mediaUrls: string[] | null;
  mediaTypes: ('image' | 'video')[] | null;
  platformResults: Record<string, { success: boolean; postId?: string; error?: string }> | null;
  status: string;
  postedAt: Date | null;
  createdAt: Date;
}

interface PostsListProps {
  groupId: number;
  posts: Post[];
  platformProfiles: Record<string, string | null>;
}

const platformIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  facebook: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: 'text-[#1877F2]'
  },
  instagram: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
      </svg>
    ),
    color: 'text-pink-600'
  },
  twitter: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: 'text-gray-900 dark:text-white'
  },
  linkedin: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: 'text-[#0A66C2]'
  },
  tiktok: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    ),
    color: 'text-gray-900 dark:text-white'
  },
  threads: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 013.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.883h-.116c-.67.02-1.288.23-1.827.613-.54.384-.96.92-1.228 1.574l-1.94-.493c.36-.852.936-1.574 1.713-2.123.777-.549 1.69-.853 2.705-.853h.116c1.607 0 2.81.524 3.58 1.558.67.9 1.063 2.103 1.176 3.59.072.976.092 1.96.06 2.937.01.836.03 1.67.06 2.503l.003.011c.007.092.015.184.023.275.1 1.156.244 2.305.433 3.448l-1.987.493c-.057-.416-.11-.833-.158-1.25-.049-.426-.094-.853-.134-1.28-1.028.975-2.368 1.489-3.992 1.529zm-.156-5.942c-1.156.047-2.129.315-2.891.797-.762.482-1.178 1.126-1.238 1.915-.057.748.245 1.397.9 1.931.655.533 1.515.797 2.572.797h.026c1.23-.05 2.192-.471 2.864-1.253.672-.782 1.016-1.863 1.025-3.245-.28-.093-.564-.17-.852-.23-.287-.06-.577-.11-.87-.15a13.44 13.44 0 00-1.536-.062z"/>
      </svg>
    ),
    color: 'text-gray-900 dark:text-white'
  },
};

export function PostsList({ groupId, posts, platformProfiles }: PostsListProps) {
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setDeletingPostId(postId);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete post');
        setDeletingPostId(null);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
      setDeletingPostId(null);
    }
  };

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-gray-900/30 p-12 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-purple-500/20 to-blue-500/20">
          <svg
            className="h-10 w-10 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white">
          No posts yet
        </h3>
        <p className="mt-2 text-gray-400">
          Create your first post to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => {
        const statusClass = post.status === 'posted' ? 'border border-green-500/30 bg-green-500/10 text-green-400' :
          post.status === 'posting' ? 'border border-blue-500/30 bg-blue-500/10 text-blue-400' :
          post.status === 'failed' ? 'border border-red-500/30 bg-red-500/10 text-red-400' :
          'border border-gray-500/30 bg-gray-500/10 text-gray-400';

        return (
          <div
            key={post.id}
            className="group rounded-2xl border border-white/10 bg-linear-to-br from-gray-900/90 to-gray-800/90 p-6 backdrop-blur-xl transition-all hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                    {post.status === 'posted' && (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {post.status === 'posting' && (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {post.status === 'failed' && (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                {post.platformResults && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Posted to:</span>
                    <div className="flex gap-2">
                      {Object.entries(post.platformResults).map(([platform, result]) => {
                        const platformInfo = platformIcons[platform];
                        if (!platformInfo) return null;
                        const borderClass = result.success ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10';
                        const profileImage = platformProfiles[platform];
                        return (
                          <div key={platform} className="flex items-center gap-1.5">
                            {profileImage && (
                              <div className="relative h-7 w-7 overflow-hidden rounded-full border border-white/20">
                                <Image
                                  src={profileImage}
                                  alt={`${platform} profile`}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            )}
                            <div
                              className={`flex items-center justify-center rounded-lg border ${borderClass} p-1.5 ${platformInfo.color}`}
                              title={`${platform}: ${result.success ? 'Success' : result.error || 'Failed'}`}
                            >
                              {platformInfo.icon}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                  className="rounded-xl border border-white/10 bg-gray-800/50 p-2 text-gray-400 transition-all hover:border-purple-500/50 hover:bg-gray-800 hover:text-purple-400"
                  title="View details"
                >
                  <svg
                    className={`h-5 w-5 transition-transform ${expandedPost === post.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  disabled={deletingPostId === post.id}
                  className="rounded-xl border border-white/10 bg-gray-800/50 p-2 text-gray-400 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  title="Delete post"
                >
                  {deletingPostId === post.id ? (
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
            </div>

            {post.caption && (
              <p className="mb-4 text-gray-300">{post.caption}</p>
            )}

            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className={`mb-4 grid gap-2 ${
                post.mediaUrls.length === 1 ? 'grid-cols-1' :
                post.mediaUrls.length === 2 ? 'grid-cols-2' :
                'grid-cols-2 md:grid-cols-3'
              }`}>
                {post.mediaUrls.slice(0, 6).map((url, index) => {
                  const mediaType = post.mediaTypes?.[index] || 'image';
                  return (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-gray-800/50">
                      {mediaType === 'video' ? (
                        <video src={url} className="h-full w-full object-cover" controls />
                      ) : (
                        <Image
                          src={url}
                          alt={`Media ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                  );
                })}
                {post.mediaUrls.length > 6 && (
                  <div className="flex items-center justify-center rounded-xl border border-white/10 bg-gray-800/50">
                    <span className="text-lg font-semibold text-gray-400">
                      +{post.mediaUrls.length - 6}
                    </span>
                  </div>
                )}
              </div>
            )}

            {expandedPost === post.id && post.platformResults && (
              <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-gray-900/50 p-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-300">Platform Results:</h4>
                {Object.entries(post.platformResults).map(([platform, result]) => {
                  const platformInfo = platformIcons[platform];
                  const resultBorderClass = result.success ? 'border border-green-500/30 bg-green-500/10' : 'border border-red-500/30 bg-red-500/10';
                  const profileImage = platformProfiles[platform];
                  return (
                    <div
                      key={platform}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-gray-800/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {profileImage && (
                          <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white/20">
                            <Image
                              src={profileImage}
                              alt={`${platform} profile`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${resultBorderClass}`}>
                          {platformInfo && <span className={platformInfo.color}>{platformInfo.icon}</span>}
                        </div>
                        <div>
                          <p className="font-medium capitalize text-white">{platform}</p>
                          {result.error && <p className="text-xs text-red-400">{result.error}</p>}
                          {result.postId && <p className="text-xs text-gray-500">ID: {result.postId}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {result.success ? (
                          <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
