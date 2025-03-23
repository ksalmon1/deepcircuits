
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

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
};

export type Component = {
  id: string;
  project_id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  position: {
    x: number;
    y: number;
  };
  rotation: number;
  created_at: string;
  updated_at: string;
};

export type UserSettings = {
  user_id: string;
  preferences: Record<string, any>;
  theme: string;
  created_at: string;
  updated_at: string;
};

export type VersionHistory = {
  id: string;
  project_id: string;
  version_number: number;
  snapshot: Record<string, any>;
  created_at: string;
  created_by: string;
};
