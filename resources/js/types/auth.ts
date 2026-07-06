export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'inactive';

/**
 * Authenticated user as shared by Laravel (User::toProfileArray()).
 */
export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface SharedPageProps {
  auth: { user: AuthUser | null };
  [key: string]: unknown;
}
