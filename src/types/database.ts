
export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRole = 'user' | 'admin';

export type UserRoleRecord = {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
};
