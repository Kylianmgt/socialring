# Change Password via CLI Guide

## Overview

SocialRing provides a command-line script to securely change user passwords without accessing the web interface. This is useful for administrative tasks or resetting passwords.

---

## PART 1: Prerequisites

Before running the password change script, ensure:

1. You have **Node.js** installed on your system
2. You have **TypeScript** installed globally or available in your project
3. You are in the SocialRing project directory
4. Your database is running and accessible
5. You have the necessary environment variables configured in `.env`

---

## PART 2: Locate the Password Change Script

The password change script is located at:

```
scripts/change-password.ts
```

This script is pre-built and ready to use.

---

## PART 3: Run the Password Change Script

### Option A: Using npm/yarn

1. Open your terminal/command prompt
2. Navigate to the SocialRing project directory:
   ```bash
   cd path/to/socialring
   ```

3. Run the password change script:
   ```bash
   npm run change-password
   ```
   
   Or if using yarn:
   ```bash
   yarn change-password
   ```

### Option B: Using TypeScript directly

1. Open your terminal/command prompt
2. Navigate to the SocialRing project directory:
   ```bash
   cd path/to/socialring
   ```

3. Run the script directly with TypeScript:
   ```bash
   npx ts-node scripts/change-password.ts
   ```

---

## PART 4: Follow the Prompts

Once the script is running, you'll be prompted to enter:

1. **User Email Address**
   - Enter the email address of the user whose password you want to change
   - Example: `user@example.com`
   - Press Enter

2. **New Password**
   - Enter the new password you want to set
   - The password will be hidden as you type (for security)
   - Press Enter

3. **Confirm Password**
   - Re-enter the new password to confirm
   - The passwords must match
   - Press Enter

4. **Confirmation Prompt**
   - The script will ask you to confirm the change
   - Type `yes` to proceed or `no` to cancel
   - Press Enter

---

## PART 5: Verify the Change

After the script completes successfully:

1. You should see a success message:
   ```
   Password changed successfully for user@example.com
   ```

2. The user can now log in with:
   - **Email**: user@example.com
   - **Password**: (the new password you just set)

---

## PART 6: Test the New Password

1. Go to the SocialRing signin page: `http://localhost:3000/auth/signin`
2. Click on "Sign in with Password"
3. Enter:
   - **Email**: user@example.com
   - **Password**: (the new password you set)
4. Click "Sign In"
5. You should be logged in successfully

---

## Example Workflow

Here's a complete example of changing a password:

```bash
$ npm run change-password

? Enter user email address: john@example.com
? Enter new password: ••••••••••
? Confirm password: ••••••••••
? Are you sure you want to change the password? (yes/no) yes

✓ Password changed successfully for john@example.com
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "User not found" error | Check that the email address is correct and exists in the database |
| "Passwords do not match" error | Re-run the script and ensure you enter the same password twice |
| Script doesn't run | Make sure you're in the correct directory and have Node.js installed |
| Database connection error | Verify your `.env` file has correct database credentials |
| Permission denied error | On macOS/Linux, you may need to run with `sudo` or check file permissions |

---

## Security Considerations

- **Do not share passwords in chat or email** - only communicate via secure channels
- **Use strong passwords** - at least 12 characters with mixed case, numbers, and symbols recommended
- **Run this script only on secure systems** - passwords are briefly visible in terminal history
- **Clear terminal history** - after changing a password, consider clearing your terminal history:
  ```bash
  # On macOS/Linux
  history -c
  
  # On Windows (PowerShell)
  Clear-History
  ```
- **Log actions** - keep a record of when and for whom passwords are changed
- **Inform users** - notify users when their password has been changed for security/admin reasons

---

## Environment Variables Required

Ensure your `.env` file contains:

```
DATABASE_URL=your_database_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NODE_ENV=development
```

If these are missing, the script will fail with a connection error.

---

## Alternative: Change Password Through Web UI

Users can also change their own password through the web interface:

1. Log in to SocialRing
2. Go to **Settings** (in the dashboard)
3. Click **Set Password** or **Change Password**
4. Enter the current password
5. Enter the new password
6. Click **Save**

---

## Resetting a Forgotten Password

If a user has forgotten their password and didn't set one during signup (OAuth only):

1. Use the CLI script above to set a new password
2. Share the temporary password with the user securely
3. Ask the user to log in and change it to a password of their choice
4. Or directly set it to their preferred password if they provide it

---

## Notes

- The script uses the same password hashing as the web interface
- Changes take effect immediately
- The old password becomes invalid immediately after the change
- No confirmation email is sent (run the script only on secure systems)
- The password change is logged in your database audit trail if configured
