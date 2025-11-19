import type { Session } from 'next-auth';

export interface ConnectedAccount {
  id: number;
  userId: string;
  groupId: number | null;
  platform: string;
  accountName: string;
  accountId: string | null;
  profileUrl: string | null;
  profileImage: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  isPage: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Group {
  id: number;
  userId: string;
  name: string;
  description: string | null;
  encryptedFacebookClientId: string | null;
  encryptedFacebookClientSecret: string | null;
  encryptedTwitterClientId: string | null;
  encryptedTwitterClientSecret: string | null;
  encryptedInstagramClientId: string | null;
  encryptedInstagramClientSecret: string | null;
  encryptedLinkedinClientId: string | null;
  encryptedLinkedinClientSecret: string | null;
  encryptedTiktokClientId: string | null;
  encryptedTiktokClientSecret: string | null;
  encryptedDiscordClientId: string | null;
  encryptedDiscordClientSecret: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  encryptedGlobalPassword: string | null;
  created_at: Date;
}

export interface AuthSession extends Session {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}
