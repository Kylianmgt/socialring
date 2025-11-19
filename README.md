# SocialRing

**A Free and Open Source Social Media Management Platform**

> ⚠️ **Disclaimer**: This project has not been tested for production use. Currently, only posting through the app is fully built. Messaging and Post Scheduling features are coming soon.

## Supported Platforms

Currently, SocialRing supports posting to the following platforms:

- **Facebook** - Post to Facebook pages
- **Instagram** - Post to Instagram business accounts
- **LinkedIn** - Post to LinkedIn personal and business profiles
- **TikTok** - Post to TikTok accounts
- **X (Twitter)** - Post to X/Twitter accounts

More platforms coming soon!

## Quick Links

- [Connection Guide - Facebook & Instagram](./CONNECT_FBIG.md) - OAuth setup for Facebook and Instagram
- [Connection Guide - Google](./CONNECT_GOOGLE.md) - OAuth setup for Google
- [Connection Guide - Twitter](./CONNECT_TWITTER.md) - OAuth setup for Twitter
- [Connection Guide - TikTok](./CONNECT_TIKTOK.md) - OAuth setup for TikTok
- [Connection Guide - LinkedIn](./CONNECT_LINKEDIN.md) - OAuth setup for LinkedIn
- [LinkedIn Page Setup](./LINKEDIN_PAGE_SETUP.md) - Configure LinkedIn business pages
- [Change Password CLI](./CHANGE_PASSWORD_CLI.md) - Command-line password management
- [Links](./LINKS.md) - Useful resources and references

## Prerequisites Installation

### 1. Download & Install Node.js

1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version (v18 or higher)
3. Run the installer and follow the setup wizard
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### 2. Download & Install Docker

1. Visit [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Download Docker Desktop for your OS (Windows, Mac, or Linux)
3. Run the installer and follow the setup wizard
4. Verify installation:
   ```bash
   docker --version
   docker-compose --version
   ```

### 3. For Windows Users: Install WSL (Windows Subsystem for Linux)

1. Open PowerShell as Administrator
2. Run:
   ```powershell
   wsl --install
   ```
3. Restart your computer
4. Set WSL 2 as default:
   ```powershell
   wsl --set-default-version 2
   ```
5. Verify installation:
   ```bash
   wsl --list --verbose
   ```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/sanjipun/SocialRing.git
cd SocialRing
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Start the Database

Start PostgreSQL in Docker:

```bash
bash start.sh
```

Or manually:

```bash
docker-compose up -d db
```

The database will be available at `localhost:5432`.

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory with your OAuth credentials:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/socialring
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=socialring

# NextAuth.js
AUTH_SECRET==
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_TRUST_HOST=true
TIKTOK_REDIRECT_URL=https://redirectmeto.com/

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

**For detailed OAuth setup instructions for each provider, see:**
- [Facebook & Instagram Setup](./CONNECT_FBIG.md)
- [Google OAuth Setup](./CONNECT_GOOGLE.md)
- [Twitter API Setup](./CONNECT_TWITTER.md)
- [TikTok OAuth Setup](./CONNECT_TIKTOK.md)
- [LinkedIn OAuth Setup](./CONNECT_LINKEDIN.md)

For LinkedIn business page setup, see [LinkedIn Page Setup Guide](./LINKEDIN_PAGE_SETUP.md).

### 4. Initialize the Database

If the database is empty, initialize the schema:

```bash
npm run db:push
```

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
src/
├── app/              # Next.js app directory
│   ├── api/         # API routes (OAuth, data endpoints)
│   ├── auth/        # Authentication pages
│   └── dashboard/   # Main application pages
├── components/      # React components
├── db/              # Database configuration
├── lib/             # Utility functions and libraries
└── types/           # TypeScript types
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push database schema

### Database Management

The project uses Drizzle ORM with PostgreSQL. Database schema is defined in `src/db/schemas/`.

### User Management

For password management via CLI, see [Change Password CLI Guide](./CHANGE_PASSWORD_CLI.md)

## Troubleshooting

### Database Connection Issues

1. Ensure Docker is running and PostgreSQL container is up:
   ```bash
   docker-compose ps
   ```

2. Check if database is accessible:
   ```bash
   psql postgresql://postgres:postgres@localhost:5432/socialring
   ```

### Port Already in Use

If port 3000 is already in use, you can change it:
```bash
npm run dev -- -p 3001
```

### OAuth Redirect Issues

Make sure `NEXTAUTH_URL` in `.env.local` matches your application URL.

## Contributing

We welcome contributions! SocialRing is a free and open source project, and we'd love your help to make it better.

### How to Contribute

1. **Fork the Repository** - Click the fork button on [GitHub](https://github.com/sanjipun/SocialRing)
2. **Create a Feature Branch** - `git checkout -b feature/your-feature-name`
3. **Make Your Changes** - Implement your feature or fix
4. **Commit Your Changes** - `git commit -m "Add your commit message"`
5. **Push to Your Branch** - `git push origin feature/your-feature-name`
6. **Open a Pull Request** - Describe your changes and submit for review

### Development Guidelines

- Follow the existing code style
- Write clear commit messages
- Test your changes before submitting
- Update documentation as needed
- Be respectful and constructive in discussions

### Areas to Contribute

- Bug fixes and improvements
- New social media platform support
- Feature development (Messaging, Post Scheduling, etc.)
- Documentation improvements
- UI/UX enhancements
- Performance optimizations

## License

This project is free and open source. Check the LICENSE file for details.

## Support

If you have questions or need help, please open an issue on [GitHub](https://github.com/sanjipun/SocialRing) or check the documentation links above.
