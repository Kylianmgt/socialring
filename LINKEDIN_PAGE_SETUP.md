# LinkedIn Page Posting Guide

Your SocialRing has been updated to support posting to LinkedIn organization pages! Here's how to set it up:

## Steps to Post to LinkedIn Pages

### 1. Get Your LinkedIn Organization ID

You can find your LinkedIn Organization ID in multiple ways:

**Option A: From Your LinkedIn Page URL**
- Go to your LinkedIn company/organization page
- Look at the URL: `linkedin.com/company/**YOUR-ORG-ID**`
- Copy that ID number

**Option B: Using LinkedIn API**
- Visit: https://www.linkedin.com/developers/tools/rest-api-explorer
- Make a GET request to `/me/organizationAcknowledgements`
- Look for the `organizationId` in the response

**Option C: Contact Support**
- Email LinkedIn support with your organization page URL
- They can provide the ID

### 2. Set Up LinkedIn Credentials in SocialRing

1. Go to your Dashboard
2. Navigate to your group settings
3. Click "Add Credentials" for LinkedIn
4. Fill in the following:
   - **Client ID**: Your LinkedIn app's Client ID
   - **Client Secret**: Your LinkedIn app's Client Secret  
   - **Access Token**: (Optional) Your personal LinkedIn access token
   - **Organization ID**: Your LinkedIn organization/company ID (the numeric ID)

5. Enter your global password and save

### 3. Connect Your LinkedIn Personal Profile

1. Click "Connect LinkedIn" button in your group
2. This will authenticate with your personal LinkedIn profile
3. Your profile will be connected to the group

### 4. Post to Your LinkedIn Page

Once set up, when you create a post:
- You'll see an option to post to either:
  - Your personal LinkedIn profile
  - Your LinkedIn organization/page (if Organization ID was provided)
- Select your organization page and publish!

## Troubleshooting

**"Bummer, something went wrong"**
- Verify your Organization ID is correct (should be just numbers)
- Make sure you're an admin of the LinkedIn organization page
- Try reconnecting your LinkedIn account

**Can't find Organization ID**
- Check if you have admin access to the page
- Make sure you're looking at a company/organization page, not a personal profile

**Posts not appearing**
- Verify the access token has necessary permissions
- Check that the Organization ID belongs to the correct page
- Ensure you're posting to the right account selection

## Need Help?

For issues with LinkedIn API or organization page access, refer to:
- LinkedIn Developer Documentation: https://learn.microsoft.com/en-us/linkedin/
- LinkedIn Support: https://www.linkedin.com/help
