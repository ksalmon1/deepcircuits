import { http } from '@/lib/http';
import { AuthUser, UserRole, UserStatus } from '@/types/auth';

export interface UserWithProfile extends AuthUser {
  name?: string | null;
}

/**
 * Admin user management API (session-authenticated, admin-only routes).
 */

export async function getAllUsers(): Promise<UserWithProfile[]> {
  const { data } = await http.get<UserWithProfile[]>('/admin/users');
  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: { display_name?: string; status?: UserStatus }
): Promise<UserWithProfile> {
  const { data } = await http.patch<UserWithProfile>(`/admin/users/${userId}`, updates);
  return data;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<UserWithProfile> {
  const { data } = await http.patch<UserWithProfile>(`/admin/users/${userId}`, { role });
  return data;
}

export async function updateUserStatus(userId: string, status: UserStatus): Promise<UserWithProfile> {
  return updateUserProfile(userId, { status });
}

export async function deleteUser(userId: string): Promise<void> {
  await http.delete(`/admin/users/${userId}`);
}
