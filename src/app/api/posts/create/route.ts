import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { posts, connectedAccounts } from '@/db/schemas';
import { eq, and } from 'drizzle-orm';
import { TwitterApi } from 'twitter-api-v2';
import { getTwitterApiCredentials, getLinkedInAccessToken, getLinkedInOrganizationId, getLinkedInGroupId } from '@/lib/group-utils';
import { csrfProtectionMiddleware, extractCsrfToken, validateCsrfToken } from '@/lib/csrf';
import { logPostCreated, logUnauthorizedAccess, logCsrfFailure } from '@/lib/audit-logging';
import { getPasswordFromSession } from '@/lib/session-storage';

type Account = typeof connectedAccounts.$inferSelect;

interface MediaBuffer {
  buffer: Buffer;
  type: 'image' | 'video';
  mimeType: string;
  filename: string;
}

// LinkedIn posting interfaces
interface LinkedInPayload {
  // UGC Posts endpoint fields (/ugcPosts)
  author?: string;
  lifecycleState?: 'PUBLISHED';
  distribution?: {
    linkedInDistributionTarget: Record<string, never>;
  };
  commentary?: string;
  specificContent?: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string;
      };
      shareMediaCategory: 'NONE' | 'IMAGE';
      media?: Array<{
        status: string;
        media: string;
      }>;
    };
  };
  visibility?: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' | 'CONTAINER';
  };
  containerEntity?: string;
  
  // Shares endpoint fields (/shares - for organization posts)
  owner?: string;
  text?: string;
}

// Helper function to post to Facebook
async function postToFacebook(account: Account, caption: string, mediaBuffers: MediaBuffer[]) {
  if (!account.accessToken) {
    return { success: false, error: 'No access token' };
  }

  try {
    // Determine if this is a page account
    const pageId = account.isPage ? account.accountId : null;
    const endpoint = pageId || 'me';
    
    // If there are images, post as photo(s)
    if (mediaBuffers && mediaBuffers.length > 0) {
      const media = mediaBuffers[0];
      
      // Use buffer directly - convert to Uint8Array for Blob
      const blob = new Blob([new Uint8Array(media.buffer)]);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('source', blob);
      formData.append('caption', caption || '');
      formData.append('access_token', account.accessToken);
      
      // Post photo with caption using FormData
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${endpoint}/photos`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return { success: true, postId: data.id || data.post_id };
    } else {
      // Text-only post
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${endpoint}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: caption,
            access_token: account.accessToken,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return { success: true, postId: data.id };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to post' };
  }
}

// Helper function to post to TikTok
async function postToTikTok(account: Account, caption: string, mediaBuffers: MediaBuffer[]) {
  if (!account.accessToken) {
    return { success: false, error: 'No TikTok access token' };
  }

  try {
    // TikTok requires media for posting
    if (!mediaBuffers || mediaBuffers.length === 0) {
      return { success: false, error: 'TikTok requires at least one video or image' };
    }

    const media = mediaBuffers[0];
    
    // Get file size
    const fileSize = media.buffer.length;
    
    // TikTok API v2 endpoint for video initialization
    // Step 1: Initialize video upload
    const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: caption || 'New post',
          privacy_level: 'SELF_ONLY', // Use SELF_ONLY for unaudited apps, change to PUBLIC_TO_EVERYONE after audit
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: fileSize,
          chunk_size: fileSize, // Upload in one chunk
          total_chunk_count: 1,
        },
      }),
    });

    const initData = await initResponse.json();

    if (initData.error?.code !== 'ok') {
      return { success: false, error: initData.error?.message || 'Failed to initialize TikTok upload' };
    }

    const uploadUrl = initData.data?.upload_url;
    const publishId = initData.data?.publish_id;

    if (!uploadUrl || !publishId) {
      return { success: false, error: 'TikTok did not return upload details' };
    }

    // Step 2: Upload the video file using PUT request
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
      },
      body: Buffer.from(media.buffer),
    });

    if (!uploadResponse.ok) {
      return { success: false, error: 'Failed to upload video to TikTok' };
    }

    // Step 3: Check upload status
    
    // Wait a moment for TikTok to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        publish_id: publishId,
      }),
    });

    const statusData = await statusResponse.json();

    if (statusData.error?.code !== 'ok') {
      return { success: false, error: statusData.error?.message || 'Failed to check TikTok post status' };
    }

    // Return success with publish ID (status will be PROCESSING or POSTED)
    return { success: true, postId: publishId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to post to TikTok' };
  }
}

// Helper function to post to Instagram
async function postToInstagram(account: Account, caption: string, mediaBuffers: MediaBuffer[], facebookPageId: string) {
  if (!account.accessToken) {
    return { success: false, error: 'No access token' };
  }

  // Instagram requires media
  if (!mediaBuffers || mediaBuffers.length === 0) {
    return { success: false, error: 'Instagram requires at least one image or video' };
  }

  try {
    const igUserId = account.accountId;
    const pageId = facebookPageId;
    
    if (!pageId) {
      return { success: false, error: 'Facebook Page ID not configured. Instagram posting requires a linked Facebook Page.' };
    }
    
    // Step 1: Upload image to Facebook Page using buffer
    const media = mediaBuffers[0];
    const blob = new Blob([new Uint8Array(media.buffer)]);
    
    const uploadFormData = new FormData();
    uploadFormData.append('source', blob);
    uploadFormData.append('published', 'false'); // Don't publish to Facebook
    uploadFormData.append('access_token', account.accessToken);
    
    const uploadResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/photos`,
      {
        method: 'POST',
        body: uploadFormData,
      }
    );
    
    const uploadData = await uploadResponse.json();

    if (uploadData.error) {
      return { success: false, error: uploadData.error.message };
    }
    
    // Get the uploaded image URL
    const photoId = uploadData.id;
    const photoDetailsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${photoId}?fields=images&access_token=${account.accessToken}`
    );
    
    const photoDetails = await photoDetailsResponse.json();
    
    if (!photoDetails.images || photoDetails.images.length === 0) {
      return { success: false, error: 'Failed to get uploaded image URL' };
    }
    
    const imageUrl = photoDetails.images[0].source;
    
    // Step 2: Create Instagram media container
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption || '',
          access_token: account.accessToken,
        }),
      }
    );

    const containerData = await containerResponse.json();

    if (containerData.error) {
      return { success: false, error: containerData.error.message };
    }

    const creationId = containerData.id;

    // Step 3: Wait for Instagram to process the media
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Publish the container
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: account.accessToken,
        }),
      }
    );

    const publishData = await publishResponse.json();

    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }

    return { success: true, postId: publishData.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to post to Instagram' };
  }
}

// Helper function to post to Twitter
async function postToTwitter(
  account: Account, 
  caption: string, 
  mediaBuffers: MediaBuffer[],
  groupId: number,
  userId: string,
  password: string
) {
  if (!account.accessToken) {
    return { success: false, error: 'No access token' };
  }

  try {
    // Twitter API v2 for posting tweets
    const tweetData: { text: string; media?: { media_ids: string[] } } = {
      text: caption || 'Check out my post!',
    };

    // If there are media files, upload them using twitter-api-v2 with group credentials
    if (mediaBuffers && mediaBuffers.length > 0) {
      const mediaIds: string[] = [];
      
      // Get API credentials (OAuth 1.0a) from group settings for media uploads
      const credentials = await getTwitterApiCredentials(
        groupId,
        userId,
        password
      );
      
      if (!credentials || !credentials.apiKey || !credentials.apiSecret) {
        return { 
          success: false, 
          error: 'Twitter API Key and Secret not configured in group settings. Please add them to enable media uploads.' 
        };
      }
      
      // For media upload, we need the user's OAuth 1.0a access token and secret
      // Since we connected with OAuth 2.0, we don't have these
      // We need to use the Consumer Key/Secret with the user's OAuth 2.0 Bearer token
      // But v1.1 media upload requires full OAuth 1.0a signing
      
      // Check if user has OAuth 1.0a tokens (refreshToken stores access secret)
      if (!account.refreshToken) {
        return {
          success: false,
          error: 'Media upload requires OAuth 1.0a. Please reconnect your Twitter account using OAuth 1.0a authentication.'
        };
      }
      
      // Create Twitter client with OAuth 1.0a credentials
      const client = new TwitterApi({
        appKey: credentials.apiKey,           // Consumer Key
        appSecret: credentials.apiSecret,     // Consumer Secret
        accessToken: account.accessToken,     // User's OAuth 1.0a access token
        accessSecret: account.refreshToken,   // User's OAuth 1.0a access secret
      });
      
      for (const media of mediaBuffers.slice(0, 4)) { // Twitter allows max 4 images
        try {
          // Upload media using twitter-api-v2 (handles OAuth 1.0a automatically)
          const mediaId = await client.v1.uploadMedia(media.buffer, { 
            mimeType: media.mimeType
          });

          mediaIds.push(mediaId);
        } catch (uploadError) {
          // Media upload failed, continue with remaining media
        }
      }

      if (mediaIds.length > 0) {
        tweetData.media = { media_ids: mediaIds };
      } else {
        return { 
          success: false, 
          error: 'Failed to upload media to Twitter' 
        };
      }
    }

    // Post tweet using OAuth 1.0a (same client that uploaded media)
    if (tweetData.media?.media_ids && tweetData.media.media_ids.length > 0) {
      // If media was uploaded, use the same OAuth 1.0a client to post
      const credentials = await getTwitterApiCredentials(
        groupId,
        userId,
        password
      );
      
      if (!credentials) {
        return { success: false, error: 'Twitter API credentials not found' };
      }
      
      // Must use OAuth 1.0a for both media upload and tweet posting
      const client = new TwitterApi({
        appKey: credentials.apiKey,           // Consumer Key
        appSecret: credentials.apiSecret,     // Consumer Secret
        accessToken: account.accessToken!,    // User's OAuth 1.0a access token
        accessSecret: account.refreshToken!,  // User's OAuth 1.0a access secret
      });

      // Prepare tweet payload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tweetPayload: any = {
        text: tweetData.text,
        media: { 
          media_ids: tweetData.media.media_ids as [string] | [string, string] | [string, string, string] | [string, string, string, string]
        }
      };
      
      try {
        const tweet = await client.v2.tweet(tweetPayload);

        if (tweet.errors && tweet.errors.length > 0) {
          const errorMessage = tweet.errors[0]?.title || 'Failed to post tweet';
          return { success: false, error: errorMessage };
        }

        return { success: true, postId: tweet.data.id };
      } catch (tweetError) {
        const errorMessage = tweetError instanceof Error ? tweetError.message : 'Failed to post tweet';
        return { success: false, error: `Tweet posting failed: ${errorMessage}` };
      }
    } else {
      // Text-only tweet using OAuth 2.0
      const response = await fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${account.accessToken}`,
        },
        body: JSON.stringify(tweetData),
      });

      const data = await response.json();

      if (data.errors) {
        return { success: false, error: data.errors[0]?.message || 'Failed to post' };
      }

      return { success: true, postId: data.data?.id };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to post' };
  }
}

// Helper function to post to LinkedIn
async function postToLinkedIn(
  account: Account, 
  caption: string, 
  mediaBuffers: MediaBuffer[],
  groupId: number,
  userId: string,
  password: string
) {
  // Prioritize account's access token over stored token
  let accessToken = account.accessToken;
  let usingStoredToken = false;
  
  // Try to get stored access token as fallback
  try {
    const storedToken = await getLinkedInAccessToken(groupId, userId, password);
    if (storedToken && !account.accessToken) {
      accessToken = storedToken;
      usingStoredToken = true;
    }
  } catch (error) {
    // Continue and rely on account.accessToken if available
  }

  if (!accessToken) {
    return { success: false, error: 'No LinkedIn access token available' };
  }

  try {
    // Get optional organization and group IDs
    let organizationId: string | null = null;
    let groupIdFromCreds: string | null = null;
    
    try {
      organizationId = await getLinkedInOrganizationId(groupId, userId, password);
      groupIdFromCreds = await getLinkedInGroupId(groupId, userId, password);
    } catch {
      // Could not retrieve organization or group IDs, will post to personal profile
    }

    const personId = account.accountId;
    if (!personId) {
      return { success: false, error: 'LinkedIn account ID missing' };
    }

    // Determine the author and visibility based on what's configured
    let authorId: string;
    let visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' | 'CONTAINER' };
    let containerEntity: string | undefined;
    let isOrganizationPost = false;

    if (organizationId && groupIdFromCreds) {
      // Both company and group: post to group
      authorId = `urn:li:person:${personId}`;
      visibility = {
        'com.linkedin.ugc.MemberNetworkVisibility': 'CONTAINER',
      };
      containerEntity = `urn:li:group:${groupIdFromCreds}`;
    } else if (organizationId && !groupIdFromCreds) {
      // Organization ID provided but no proper permissions for /shares endpoint
      // Fall back to personal profile posting
      // Note: True organization posting requires w_organization_social scope and Marketing Partner approval
      authorId = `urn:li:person:${personId}`;
      visibility = {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      };
      isOrganizationPost = false;
    } else if (groupIdFromCreds) {
      // Only group: post to group
      authorId = `urn:li:person:${personId}`;
      visibility = {
        'com.linkedin.ugc.MemberNetworkVisibility': 'CONTAINER',
      };
      containerEntity = `urn:li:group:${groupIdFromCreds}`;
    } else {
      // Neither: post to personal profile
      authorId = `urn:li:person:${personId}`;
      visibility = {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      };
    }

    // Build the post payload according to LinkedIn API documentation
    let postPayload: LinkedInPayload;
    
    if (isOrganizationPost && organizationId && !groupIdFromCreds) {
      // Organization posting uses /shares endpoint (requires w_organization_social scope)
      postPayload = {
        distribution: {
          linkedInDistributionTarget: {},
        },
        owner: `urn:li:organization:${organizationId}`,
        text: caption || 'Check out this post!',
      };
    } else {
      // Personal profile and group posting use UGC format (/ugcPosts endpoint)
      postPayload = {
        author: authorId,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: caption || 'Check out my post!',
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility,
      };

      // Add container entity if posting to a group
      if (containerEntity) {
        postPayload.containerEntity = containerEntity;
      }
    }

    // If there are media files, add them
    if (mediaBuffers && mediaBuffers.length > 0) {
      const media = mediaBuffers[0]; // LinkedIn typically allows 1 image per post

      // Step 1: Register media upload
      const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: authorId,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        }),
      });

      const registerData = await registerResponse.json();

      // Check if token is revoked and retry with account token if we were using stored token
      if (registerData.code === 'REVOKED_ACCESS_TOKEN' && usingStoredToken && account.accessToken) {
        accessToken = account.accessToken;
        usingStoredToken = false;
        
        // Retry registration with account token
        const retryRegisterResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: authorId,
              serviceRelationships: [
                {
                  relationshipType: 'OWNER',
                  identifier: 'urn:li:userGeneratedContent',
                },
              ],
            },
          }),
        });
        
        const retryRegisterData = await retryRegisterResponse.json();
        
        if (!retryRegisterData.value) {
          return { 
            success: false, 
            error: retryRegisterData.message || 'Failed to register media with LinkedIn. Please reconnect your LinkedIn account.' 
          };
        }
        
        // Use retry data for subsequent steps
        const uploadUrl = retryRegisterData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
        const mediaAsset = retryRegisterData.value.asset;
        
        if (!uploadUrl || !mediaAsset) {
          return { success: false, error: 'Failed to get LinkedIn upload URL' };
        }
        
        // Continue with upload using the retry data
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: Buffer.from(media.buffer),
        });

        if (!uploadResponse.ok) {
          return { success: false, error: `Failed to upload media: ${uploadResponse.statusText}` };
        }

        // Update post payload with media (only for UGC posts)
        if (postPayload.specificContent) {
          postPayload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
          postPayload.specificContent['com.linkedin.ugc.ShareContent'].media = [
            {
              status: 'READY',
              media: mediaAsset,
            },
          ];
        }
      } else if (!registerData.value) {
        return { 
          success: false, 
          error: registerData.message || 'Failed to register media with LinkedIn' 
        };
      } else {
        // Normal flow - registration succeeded
        const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
        const mediaAsset = registerData.value.asset;

        if (!uploadUrl || !mediaAsset) {
          return { success: false, error: 'Failed to get LinkedIn upload URL' };
        }

        // Step 2: Upload media binary file
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: Buffer.from(media.buffer),
        });

        if (!uploadResponse.ok) {
          return { success: false, error: `Failed to upload media: ${uploadResponse.statusText}` };
        }

        // Step 3: Update post payload with media (only for UGC posts)
        if (postPayload.specificContent) {
          postPayload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
          postPayload.specificContent['com.linkedin.ugc.ShareContent'].media = [
            {
              status: 'READY',
              media: mediaAsset,
            },
          ];
        }
      }
    }

    // Step 4: Create the post
    // Use different endpoints based on posting type
    const endpoint = isOrganizationPost && organizationId && !groupIdFromCreds
      ? 'https://api.linkedin.com/v2/shares'
      : 'https://api.linkedin.com/v2/ugcPosts';
    
    const postResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postPayload),
    });

    const postData = await postResponse.json();

    if (!postResponse.ok) {
      return { 
        success: false, 
        error: postData.message || postData.serviceErrorCode || 'Failed to create LinkedIn post' 
      };
    }

    if (postData.error || postData.errors) {
      const errorMsg = postData.error || (postData.errors && postData.errors[0]?.message) || 'Failed to create LinkedIn post';
      return { 
        success: false, 
        error: errorMsg
      };
    }

    const postId = postData.id || postData.value;
    if (!postId) {
      return { 
        success: false, 
        error: 'LinkedIn post created but no ID returned' 
      };
    }

    return { success: true, postId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to post to LinkedIn' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      await logUnauthorizedAccess(request, 'No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CSRF validation
    const sessionId = request.cookies.get('sessionId')?.value;
    const csrfToken = extractCsrfToken(request);
    
    if (!csrfToken || !sessionId || !validateCsrfToken(sessionId, csrfToken)) {
      await logCsrfFailure(request, session.user.id);
      return NextResponse.json(
        { error: 'CSRF validation failed', code: 'CSRF_TOKEN_INVALID' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const groupId = parseInt(formData.get('groupId') as string);
    const caption = formData.get('caption') as string;
    const mediaFiles = formData.getAll('media') as File[];

    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    // Get password from session (set by /api/user/validate-password)
    const passwordSessionId = request.cookies.get('_pwd_session')?.value;
    if (!passwordSessionId) {
      return NextResponse.json({ error: 'Password not validated. Please provide your global password.' }, { status: 401 });
    }

    const password = await getPasswordFromSession(passwordSessionId);
    if (!password) {
      return NextResponse.json({ error: 'Password session expired. Please validate password again.' }, { status: 401 });
    }

    // Get Facebook Page ID automatically from connected accounts if Instagram accounts exist
    let facebookPageId: string | null = null;
    const hasInstagramAccounts = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, session.user.id),
          eq(connectedAccounts.groupId, groupId),
          eq(connectedAccounts.platform, 'instagram')
        )
      );
    
    if (hasInstagramAccounts.length > 0) {
      // Get Facebook Page ID from connected accounts
      const facebookPages = await db
        .select()
        .from(connectedAccounts)
        .where(
          and(
            eq(connectedAccounts.userId, session.user.id),
            eq(connectedAccounts.groupId, groupId),
            eq(connectedAccounts.platform, 'facebook'),
            eq(connectedAccounts.isPage, 1)
          )
        );
      
      if (facebookPages.length === 0) {
        return NextResponse.json({ 
          error: 'No Facebook Page connected. Instagram posting requires a Facebook Page. Please connect your Facebook account first.' 
        }, { status: 400 });
      }
      
      // Use the first Facebook Page found
      facebookPageId = facebookPages[0].accountId;
    }

    // Get accounts for this group
    const accounts = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, session.user.id),
          eq(connectedAccounts.groupId, groupId)
        )
      );

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No accounts in this group' }, { status: 400 });
    }

    // Process media files (convert to buffers directly, no disk I/O)
    const mediaUrls: string[] = [];
    const mediaTypes: ('image' | 'video')[] = [];
    const mediaBuffers: { buffer: Buffer; type: 'image' | 'video'; mimeType: string; filename: string }[] = [];

    if (mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        
        // Store in-memory for posting to platforms
        mediaBuffers.push({
          buffer,
          type,
          mimeType: file.type,
          filename: file.name,
        });
        
        // For database record (we'll generate URLs after successful posts)
        mediaUrls.push(`media-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        mediaTypes.push(type);
      }
    }

    // Create post in database
    const [post] = await db.insert(posts).values({
      userId: session.user.id,
      groupId: groupId,
      caption: caption || null,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : null,
      mediaTypes: mediaTypes.length > 0 ? mediaTypes : null,
      status: 'draft',
      platformResults: null,
    }).returning();

    // Post to each platform
    const platformResults: Record<string, { success: boolean; postId?: string; error?: string }> = {};
    
    for (const account of accounts) {
      try {
        let result;
        
        switch (account.platform) {
          case 'facebook':
            result = await postToFacebook(account, caption, mediaBuffers);
            break;
          case 'instagram':
            if (!facebookPageId) {
              result = { success: false, error: 'No Facebook Page connected for Instagram posting' };
            } else {
              result = await postToInstagram(account, caption, mediaBuffers, facebookPageId);
            }
            break;
          case 'twitter':
            result = await postToTwitter(account, caption, mediaBuffers, groupId, session.user.id, password);
            break;
          case 'linkedin':
            result = await postToLinkedIn(account, caption, mediaBuffers, groupId, session.user.id, password);
            break;
          case 'tiktok':
            result = await postToTikTok(account, caption, mediaBuffers);
            break;
          default:
            result = { success: false, error: 'Platform not supported yet' };
        }
        
        platformResults[`${account.platform}-${account.id}`] = result;
      } catch (error) {
        platformResults[`${account.platform}-${account.id}`] = {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to post',
        };
      }
    }

    // Update post status
    const allSuccess = Object.values(platformResults).every(r => r.success);
    await db.update(posts)
      .set({
        status: allSuccess ? 'posted' : 'partial',
        platformResults,
        postedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, post.id));

    // Log successful post creation
    const platforms = Object.keys(platformResults).map(k => k.split('-')[0]);
    await logPostCreated(session.user.id, request, post.id.toString(), platforms);

    return NextResponse.json({
      success: true,
      postId: post.id,
      platformResults,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
