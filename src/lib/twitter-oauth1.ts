import crypto from 'crypto';

/**
 * Generate OAuth 1.0a signature for Twitter API requests
 */
export function generateOAuth1Signature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  // 1. Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // 2. Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  // 3. Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // 4. Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  return signature;
}

/**
 * Generate OAuth 1.0a Authorization header for Twitter media upload
 */
export function generateOAuth1Header(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  additionalParams: Record<string, string> = {}
): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(32).toString('base64').replace(/\W/g, ''),
    oauth_version: '1.0',
  };

  // Only include oauth_token if we have one (not needed for request_token step)
  if (accessToken) {
    oauth.oauth_token = accessToken;
  }

  // Combine OAuth params with any additional params for signature
  const allParams = { ...oauth, ...additionalParams };

  // Generate signature
  const signature = generateOAuth1Signature(
    method,
    url,
    allParams,
    consumerSecret,
    accessTokenSecret
  );

  oauth.oauth_signature = signature;

  // Create Authorization header
  const authHeader = 'OAuth ' + Object.keys(oauth)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauth[key]!)}"`)
    .join(', ');

  return authHeader;
}
