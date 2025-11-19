# Google OAuth Setup Guide

## Overview

Google OAuth enables users to sign in to SocialRing using their Google account. This guide walks through setting up Google OAuth in the Google Cloud Console.

---

## PART 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "NEW PROJECT"
4. Enter a project name (e.g., "SocialRing")
5. Click "CREATE"
6. Wait for the project to be created (this may take a minute)

---

## PART 2: Enable the Google+ API

1. In the Google Cloud Console, go to the **APIs & Services** section
2. Click on **Library** (in the left sidebar)
3. Search for "Google+ API"
4. Click on the Google+ API result
5. Click the **ENABLE** button
6. Wait for the API to be enabled

---

## PART 3: Create OAuth 2.0 Credentials

1. In **APIs & Services**, click on **Credentials** (in the left sidebar)
2. Click the **+ CREATE CREDENTIALS** button at the top
3. Select **OAuth 2.0 Client ID** from the dropdown
4. If you see a warning about creating a consent screen first:
   - Click **CREATE CONSENT SCREEN**
   - Choose **External** as the user type
   - Click **CREATE**
5. Fill out the OAuth consent screen form:
   - **App name**: SocialRing
   - **User support email**: (your email)
   - **Developer contact information**: (your email)
   - Click **SAVE AND CONTINUE**
6. On the "Scopes" page, click **SAVE AND CONTINUE** (no scopes needed for basic OAuth)
7. On the "Test users" page, click **SAVE AND CONTINUE**
8. Review and click **BACK TO DASHBOARD**

---

## PART 4: Create OAuth 2.0 Client ID

1. Back in **Credentials**, click **+ CREATE CREDENTIALS** again
2. Select **OAuth 2.0 Client ID**
3. For **Application type**, select **Web application**
4. Under **Name**, enter "SocialRing Web Client"
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (for local development)
   - `https://yourdomain.com` (for production - update with your actual domain)
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/callback/google` (for local development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
7. Click **CREATE**
8. A popup will show your **Client ID** and **Client Secret**
   - Copy both values (you'll need these next)
9. Click **OK** to close the popup

---

## PART 5: Add Credentials to Your Application

1. Open your `.env` file in the SocialRing project
2. Add the following environment variables:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```
3. Replace:
   - `your_client_id_here` with the Client ID from Step 8
   - `your_client_secret_here` with the Client Secret from Step 8
4. Save the `.env` file
5. Restart your development server for changes to take effect

---

## PART 6: Verify OAuth is Configured

1. Start your SocialRing application
2. Go to the signin page: `http://localhost:3000/auth/signin`
3. You should see a "Sign in with Google" button
4. Click it to test the OAuth flow
5. You should be redirected to Google's login page
6. After authenticating, you should be redirected back to your app

---

## Testing in Production

For production deployment:

1. Update your redirect URIs in Google Cloud Console:
   - JavaScript origins: `https://yourdomain.com`
   - Redirect URIs: `https://yourdomain.com/api/auth/callback/google`

2. Update your `.env` file with production redirect URI:
   ```
   NEXTAUTH_URL=https://yourdomain.com
   ```

3. Redeploy your application

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Redirect URI mismatch" error | Ensure your redirect URI in the app exactly matches what's registered in Google Cloud Console |
| "Invalid client ID" error | Check that `GOOGLE_CLIENT_ID` in `.env` is correct and the server is restarted |
| Google signin button not appearing | Verify Google OAuth is enabled in NextAuth configuration |
| "Sign in with Google" not working | Make sure JavaScript origins are properly configured in Google Cloud Console |

---

## Notes

- **Client ID**: Public identifier for your application (safe to share)
- **Client Secret**: Private key - **DO NOT commit to version control** (keep in `.env` only)
- **Scope**: Google OAuth uses the default `profile` and `email` scopes
- **Session Management**: Handled by NextAuth.js automatically
- **User Data**: Email and profile picture are automatically synced to your database
