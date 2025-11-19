# CLI Scripts

## Database Migration

Set up the complete database schema with all required tables and columns.

### Installation

The bash script requires `docker-compose` to be installed and running.
The TypeScript script additionally requires `tsx`.

### Usage

**Option 1: Using bash script (Recommended)**
```bash
bash scripts/migrate-db.sh
```

**Option 2: Using TypeScript script**
```bash
npx tsx scripts/migrate-db.ts
```

**Option 3: Using npm script**
```bash
npm run cli:migrate-db
```

### What It Does

The migration script performs the following steps:

1. **Checks Docker environment** - Verifies Docker Compose is available
2. **Starts containers** - Automatically starts Docker containers if not running
3. **Creates base schema** - Runs the Drizzle migration with 7 tables:
   - `users` - User accounts with NextAuth integration
   - `accounts` - OAuth provider accounts
   - `sessions` - Authentication sessions
   - `connected_accounts` - Connected social media accounts with encrypted tokens
   - `groups` - Account groups for organizing posts with platform credentials
   - `posts` - Scheduled posts
   - `verificationTokens` - Email verification tokens

4. **Adds encrypted columns to connected_accounts** - Platform-specific access tokens:
   - `encrypted_facebook_access_token`
   - `encrypted_twitter_api_key`
   - `encrypted_twitter_api_secret`
   - `encrypted_instagram_access_token`
   - `encrypted_linkedin_access_token`
   - `encrypted_tiktok_access_token`
   - `encrypted_discord_access_token`

5. **Adds encrypted LinkedIn columns to groups**:
   - `encrypted_linkedin_access_token`
   - `encrypted_linkedin_group_id`

6. **Verifies all tables exist** - Final schema validation

### Output Example

```bash
$ bash scripts/migrate-db.sh

Ì∫Ä Starting SocialRing Database Migration...

Checking Docker containers...

Step 1: Creating base schema...
‚úì Base schema created

Step 2: Adding encrypted_global_password to users table...
‚úì encrypted_global_password column added

Step 3: Adding encrypted token columns to connected_accounts table...
‚úì Encrypted token columns added to connected_accounts

Step 4: Adding encrypted LinkedIn columns to groups table...
‚úì LinkedIn columns added to groups

Step 5: Verifying database tables...
        table_name
--------------------
 accounts
 connected_accounts
 groups
 posts
 sessions
 users
 verificationTokens
(7 rows)

‚úÖ Database migration completed successfully!

Summary:
  ‚Ä¢ Base schema with 7 tables created
  ‚Ä¢ users table: added encrypted_global_password
  ‚Ä¢ connected_accounts table: added 7 encrypted token columns
  ‚Ä¢ groups table: added 2 encrypted LinkedIn columns

Your SocialRing database is ready to use!
Access the application at: http://localhost:3000
```

### Requirements

- Docker and Docker Compose installed and running
- PostgreSQL service running via `docker-compose up -d`
- `psql` available in the container
- Write access to the database

### Troubleshooting

**"Docker Compose not found"**
- Install Docker Desktop or Docker Compose
- Ensure Docker daemon is running

**"Connection refused"**
- Run `docker-compose up -d` first to start containers
- Wait a few seconds for PostgreSQL to initialize

**"Column already exists"**
- This is normal - the script uses `IF NOT EXISTS` to prevent errors
- Safe to run multiple times

**"Database socialring does not exist"**
- Create the database first with: `docker-compose up -d`
- Or manually: `docker-compose exec -T db createdb -U postgres socialring`

**"Application still showing 500 errors after migration"**
- Restart the app: `docker-compose restart app`
- Check logs: `docker-compose logs app -f`
- Ensure all columns were added correctly

---

## Change Global Password

Change a user's global password from the command line.

### Installation

The script requires `tsx` to be installed. It should already be in your devDependencies, but if not:

```bash
npm install tsx --save-dev
```

### Usage

**Option 1: Using npm script (Recommended)**
```bash
npm run cli:change-password
```

**Option 2: Using bash script (Linux/Mac only)**
```bash
bash scripts/change-password.sh
```

**Option 3: Direct tsx execution**
```bash
npx tsx scripts/change-password.ts
```

### Steps

1. Enter the user ID or email address
2. Enter the new password (minimum 8 characters)
3. Confirm the new password
4. The password will be encrypted and updated in the database

### Example

```bash
$ npm run cli:change-password

Ì¥ê Change Global Password

Enter user ID or email: user@example.com
‚úì User found: John Doe
  ID: clsj1h2j3k4l5m6n7o8p9q0r
  Email: user@example.com
  Password set: Yes

Enter new password (minimum 8 characters): **NewSecurePassword123**
Confirm new password: **NewSecurePassword123**

‚úÖ Global password updated successfully!
```

### Requirements

- Node.js 18+ (for tsx)
- User must exist in the database
- New password must be at least 8 characters long
- Passwords must match during confirmation
- Database connection must be configured via `DATABASE_URL` environment variable

### Troubleshooting

**"User not found"**
- Make sure you entered the correct user ID or email
- Check if the user exists in your database

**"Password must be at least 8 characters"**
- Passwords must be 8+ characters for security

**"Module not found" error**
- Run `npm install` to install all dependencies including `tsx`
- Make sure you're in the project root directory
