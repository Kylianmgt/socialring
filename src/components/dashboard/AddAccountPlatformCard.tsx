'use client';

import { ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { PasswordModal } from './PasswordModal';

interface AddAccountPlatformCardProps {
  platformId?: string;
  platformName?: string;
  platformIconPath?: string;
  platformViewBox?: string;
  platformColor?: string;
  name?: string;
  icon?: ReactNode;
  color?: string;
  connectUrl?: string;
  isConnected?: boolean;
  connectedAccountName?: string;
  groupId?: number;
}

export function AddAccountPlatformCard({
  platformId,
  platformName,
  platformIconPath,
  platformViewBox,
  platformColor,
  name,
  icon,
  color,
  connectUrl,
  isConnected = false,
  connectedAccountName,
  groupId,
}: AddAccountPlatformCardProps) {
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    globalPassword: '',
    pageId: '',
    consumerKey: '',
    consumerSecret: '',
    linkedinCompanyId: '',
    linkedinGroupId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConnect = async () => {
    // Platforms that need stored credentials
    const platformsNeedingCredentials = ['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok'];
    const needsCredentials = platformsNeedingCredentials.includes(platformId || '');
    
    if (groupId) {
      if (needsCredentials) {
        // Show modal for credentials
        setShowCredentialsModal(true);
        setFormData({
          clientId: '',
          clientSecret: '',
          globalPassword: '',
          pageId: '',
          consumerKey: '',
          consumerSecret: '',
          linkedinCompanyId: '',
          linkedinGroupId: '',
        });
      } else {
        // For other OAuth2-only platforms, show password modal
        setShowPasswordModal(true);
      }
    }
  };

  const handlePasswordModalSubmit = async (password: string) => {
    try {
      const passwordValidationResponse = await fetch(`/api/user/validate-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!passwordValidationResponse.ok) {
        const errorData = await passwordValidationResponse.json();
        throw new Error(errorData.error || 'Invalid password');
      }

      // Password validated and cookie set, wait a moment to ensure cookie is available
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect to OAuth
      const url = connectUrl || `/api/connect/${platformId}`;
      window.location.href = `${url}?groupId=${groupId}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to validate password');
      throw err;
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isTwitter = platformId === 'twitter' || name?.toLowerCase().includes('twitter') || name?.toLowerCase().includes('x');
    const isLinkedIn = platformId === 'linkedin' || name?.toLowerCase().includes('linkedin');
    const isFacebook = platformId === 'facebook' || name?.toLowerCase().includes('facebook');

    // Validation
    if (isTwitter) {
      if (!formData.consumerKey.trim()) {
        toast.error('Consumer Key (API Key) is required for Twitter');
        return;
      }
      if (!formData.consumerSecret.trim()) {
        toast.error('Consumer Secret (API Secret) is required for Twitter');
        return;
      }
    } else if (isLinkedIn) {
      if (!formData.clientId.trim()) {
        toast.error('Client ID is required for LinkedIn');
        return;
      }
      if (!formData.clientSecret.trim()) {
        toast.error('Client Secret is required for LinkedIn');
        return;
      }
    } else {
      if (!formData.clientId.trim()) {
        toast.error('Client ID is required');
        return;
      }
      if (!formData.clientSecret.trim()) {
        toast.error('Client Secret is required');
        return;
      }
    }

    if (!formData.globalPassword) {
      toast.error('Global password is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // First, validate the global password
      const passwordValidationResponse = await fetch(`/api/user/validate-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formData.globalPassword }),
      });

      if (!passwordValidationResponse.ok) {
        const errorData = await passwordValidationResponse.json();
        throw new Error(errorData.error || 'Invalid password');
      }

      // Password is valid, save credentials
      const credentialsResponse = await fetch(`/api/groups/${groupId}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platformId,
          clientId: isTwitter ? formData.consumerKey : formData.clientId,
          clientSecret: isTwitter ? formData.consumerSecret : formData.clientSecret,
          consumerKey: isTwitter ? formData.consumerKey : undefined,
          consumerSecret: isTwitter ? formData.consumerSecret : undefined,
          password: formData.globalPassword,
          pageId: isFacebook && formData.pageId ? formData.pageId : undefined,
          linkedinCompanyId: isLinkedIn && formData.linkedinCompanyId ? formData.linkedinCompanyId : undefined,
          linkedinGroupId: isLinkedIn && formData.linkedinGroupId ? formData.linkedinGroupId : undefined,
        }),
      });

      const credentialsData = await credentialsResponse.json();

      if (!credentialsResponse.ok) {
        throw new Error(credentialsData.error || 'Failed to save credentials');
      }

      // Password is validated and credentials are saved
      // Wait a moment to ensure cookie is available, then redirect to OAuth
      await new Promise(resolve => setTimeout(resolve, 100));
      const baseUrl = connectUrl || `/api/connect/${platformId}`;
      const url = `${baseUrl}?groupId=${groupId}`;
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to proceed');
      setIsSubmitting(false);
    }
  };

  const displayName = name || platformName;
  const displayColor = color || platformColor;

  return (
    <div className="group relative transform overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:bg-gray-800">
      <div className="flex flex-col items-center gap-4">
        {/* Platform Icon with gradient background */}
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-2xl ${displayColor} text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}
        >
          {icon ? (
            icon
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox={platformViewBox}
              fill="white"
              className="h-10 w-10"
            >
              <path d={platformIconPath} />
            </svg>
          )}
        </div>

        {/* Platform Info */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {displayName}
          </h3>
          {isConnected && connectedAccountName ? (
            <div className="mt-2 animate-in fade-in duration-300">
              <div className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-green-100 to-emerald-100 px-3 py-1 text-sm font-semibold text-green-800 dark:from-green-900 dark:to-emerald-900 dark:text-green-200">
                <svg className="h-4 w-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Connected
              </div>
              <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                {connectedAccountName}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Connect your {displayName} account
            </p>
          )}
        </div>

        {/* Connect/Replace Button */}
        <button
          onClick={handleConnect}
          className={`w-full rounded-xl ${displayColor} px-6 py-3 font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95`}
        >
          <span className="flex items-center justify-center gap-2">
            {isConnected ? (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Replace Account
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Connect
              </>
            )}
          </span>
        </button>
      </div>

      {/* Credentials Modal via Portal to escape stacking context */}
      {showCredentialsModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all animate-in zoom-in-95 duration-200 dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className={`border-b border-gray-200 ${displayColor} px-6 py-4 dark:border-gray-700`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Connect {displayName}</h3>
                  <p className="mt-1 text-sm text-white/80">Enter your OAuth credentials to connect</p>
                </div>
                <button
                  onClick={() => setShowCredentialsModal(false)}
                  disabled={isSubmitting}
                  className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-50"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Form */}
            <form onSubmit={handleCredentialsSubmit} className="p-6">
              <div className="space-y-4">
                {(platformId === 'twitter' || name?.toLowerCase().includes('twitter') || name?.toLowerCase().includes('x')) && (
                  <div className="rounded-xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-cyan-50 p-4 dark:border-blue-800 dark:from-blue-900/20 dark:to-cyan-900/20">
                    <div className="flex gap-3">
                      <svg className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-blue-900 dark:text-blue-200">Twitter OAuth 1.0a</p>
                        <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">Twitter requires OAuth 1.0a credentials (Consumer Key/Secret) for media uploads and posting.</p>
                      </div>
                    </div>
                  </div>
                )}
                {(platformId === 'linkedin' || name?.toLowerCase().includes('linkedin')) && (
                  <div className="rounded-xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-cyan-50 p-4 dark:border-blue-800 dark:from-blue-900/20 dark:to-cyan-900/20">
                    <div className="flex gap-3">
                      <svg className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-blue-900 dark:text-blue-200">LinkedIn OAuth 2.0</p>
                        <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">Enter your LinkedIn app credentials to enable posting to LinkedIn from this group.</p>
                      </div>
                    </div>
                  </div>
                )}
                {(platformId === 'tiktok' || name?.toLowerCase().includes('tiktok')) && (
                  <div className="rounded-xl border-2 border-black/20 bg-linear-to-br from-gray-50 to-gray-100 p-4 dark:border-gray-700 dark:from-gray-900/30 dark:to-gray-800/30">
                    <div className="flex gap-3">
                      <svg className="h-6 w-6 shrink-0 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-200">TikTok OAuth 2.0</p>
                        <p className="mt-1 text-sm text-gray-800 dark:text-gray-300">Enter your TikTok app credentials to enable video posting to TikTok from this group.</p>
                      </div>
                    </div>
                  </div>
                )}
                {(platformId === 'twitter' || name?.toLowerCase().includes('twitter') || name?.toLowerCase().includes('x')) ? (
                  <>
                    <div className="space-y-4">
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Consumer Key (API Key) <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={formData.consumerKey}
                          onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
                          placeholder="Your Twitter Consumer Key"
                          className="mt-2 w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
                          disabled={isSubmitting}
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Found in Twitter Developer Portal → Keys and Tokens</p>
                      </div>
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Consumer Secret (API Secret) <span className="text-red-500">*</span></label>
                        <input
                          type="password"
                          value={formData.consumerSecret}
                          onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
                          placeholder="Your Twitter Consumer Secret"
                          className="mt-2 w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Client ID <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={formData.clientId}
                          onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                          placeholder={`${displayName} Client ID`}
                          className="mt-2 w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-purple-400"
                          disabled={isSubmitting}
                          required
                        />
                        {(platformId === 'linkedin' || name?.toLowerCase().includes('linkedin')) && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Found in LinkedIn Developer Portal → My apps → App credentials</p>
                        )}
                      </div>
                      <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Client Secret <span className="text-red-500">*</span></label>
                        <input
                          type="password"
                          value={formData.clientSecret}
                          onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                          placeholder={`${displayName} Client Secret`}
                          className="mt-2 w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-purple-400"
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                      {(platformId === 'linkedin' || name?.toLowerCase().includes('linkedin')) && (
                        <>
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Company ID <span className="text-sm font-normal text-gray-500">(Optional - Required Company Verification in LinkedIn)</span></label>
                            <input
                              type="text"
                              value={formData.linkedinCompanyId}
                              onChange={(e) => setFormData({ ...formData, linkedinCompanyId: e.target.value })}
                              placeholder="LinkedIn company/organization ID (e.g., 12345678)"
                              className="mt-2 w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-purple-400"
                              disabled={isSubmitting}
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Post to your LinkedIn company page: linkedin.com/company/<strong>COMPANY_ID</strong></p>
                          </div>
                          <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Group ID <span className="text-sm font-normal text-gray-500">(Optional)</span></label>
                            <input
                              type="text"
                              value={formData.linkedinGroupId}
                              onChange={(e) => setFormData({ ...formData, linkedinGroupId: e.target.value })}
                              placeholder="LinkedIn group ID (e.g., 6543210)"
                              className="mt-2 w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-purple-400"
                              disabled={isSubmitting}
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Post to a LinkedIn group: linkedin.com/groups/<strong>GROUP_ID</strong></p>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
                {(platformId === 'facebook' || name?.toLowerCase().includes('facebook')) && (
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Facebook Page ID <span className="text-sm font-normal text-gray-500">(Optional)</span></label>
                    <input
                      type="text"
                      value={formData.pageId}
                      onChange={(e) => setFormData({ ...formData, pageId: e.target.value })}
                      placeholder="Page ID for Instagram integration"
                      className="mt-2 w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-purple-400"
                      disabled={isSubmitting}
                    />
                  </div>
                )}
                {(platformId === 'tiktok' || name?.toLowerCase().includes('tiktok')) && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <strong>Where to find TikTok credentials:</strong>
                      <br />
                      1. Go to <a href="https://developers.tiktok.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">TikTok Developer Portal</a>
                      <br />
                      2. Create a new application with Login Kit and Content Posting API enabled
                      <br />
                      3. Add Redirect URI: <code className="bg-gray-200 px-2 py-1 rounded dark:bg-gray-700">https://localhost:3000/api/connect/tiktok/</code>
                      <br />
                      4. Copy your Client ID and Client Secret from app credentials
                      <br />
                      5. Enable scopes: <code className="bg-gray-200 px-2 py-1 rounded dark:bg-gray-700">user.info.basic, video.upload, video.publish</code>
                    </p>
                  </div>
                )}
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Global Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    value={formData.globalPassword}
                    onChange={(e) => setFormData({ ...formData, globalPassword: e.target.value })}
                    placeholder="Enter your global password"
                    className="mt-2 w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-base transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-purple-400"
                    disabled={isSubmitting}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Used to encrypt your credentials securely</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCredentialsModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 rounded-lg ${displayColor} px-6 py-3 font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </span>
                  ) : 'Continue to Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Password Modal */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSubmit={handlePasswordModalSubmit}
        isLoading={isSubmitting}
      />
    </div>
  );
}
