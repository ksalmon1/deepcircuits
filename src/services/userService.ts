
import { supabase } from "@/integrations/supabase/client";
import { Profile, UserRole } from "@/types/database";
import { User } from "@supabase/supabase-js";

export type UserWithProfile = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: 'active' | 'inactive';
  created_at: string;
};

// Get all users (using public schema instead of admin API)
export const getAllUsers = async (): Promise<UserWithProfile[]> => {
  try {
    console.log("Fetching user data from profiles and user_roles tables");
    
    // Get all profiles from the profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Get all user roles from the user_roles table
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');
      
    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      throw rolesError;
    }

    // Map profiles with their roles
    const users = profiles.map((profile: Profile) => {
      const roleRecord = userRoles?.find((r) => r.user_id === profile.id) || null;
      
      return {
        id: profile.id,
        email: profile.display_name?.includes('@') ? profile.display_name : `${profile.display_name || 'user'}@example.com`,
        name: profile.display_name || 'Unknown',
        role: (roleRecord?.role as UserRole) || 'user',
        status: 'active' as const, // Assuming all profiles are for active users
        created_at: profile.created_at,
      };
    });

    console.log(`Found ${users.length} users`);
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<UserWithProfile | null> => {
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError && profileError.code !== 'PGRST116') { // Not found is okay
      throw profileError;
    }

    if (!profile) {
      return null;
    }

    // Get user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
      
    if (roleError && roleError.code !== 'PGRST116') { // Not found is okay
      throw roleError;
    }
    
    return {
      id: profile.id,
      email: profile.display_name?.includes('@') ? profile.display_name : `${profile.display_name || 'user'}@example.com`,
      name: profile.display_name || 'Unknown',
      role: (roleData?.role as UserRole) || 'user',
      status: 'active' as const,
      created_at: profile.created_at,
    };
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (
  userId: string, 
  data: { display_name?: string; avatar_url?: string; }
): Promise<Profile> => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return profile;
};

// Update user status (active/inactive)
// Note: This now just updates a field in the profiles table instead of using auth.admin
export const updateUserStatus = async (userId: string, status: 'active' | 'inactive'): Promise<void> => {
  // Create a custom field in profiles to track status since we can't use auth.admin
  const { error } = await supabase
    .from('profiles')
    .update({ 
      status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    throw error;
  }
};

// Update user role
export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  // First check if user has a role record
  const { data: existingRole, error: checkError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (checkError && checkError.code !== 'PGRST116') { // Not found is okay
    throw checkError;
  }

  if (existingRole) {
    // Update existing role
    const { error } = await supabase
      .from('user_roles')
      .update({ role })
      .eq('user_id', userId);
      
    if (error) {
      throw error;
    }
  } else {
    // Insert new role
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role });
      
    if (error) {
      throw error;
    }
  }
};

// Create a new user (simplified version that works without admin access)
export const createUser = async (
  email: string, 
  password: string, 
  userData: { 
    display_name?: string; 
    role?: UserRole; 
  }
): Promise<string> => {
  // Since we can't directly create users without admin access,
  // we'll show a message that this feature requires admin service role
  throw new Error("Creating users requires service_role key access in Supabase. This feature is not available in the current implementation.");
};

// Delete a user (simplified version that works without admin access)
export const deleteUser = async (userId: string): Promise<void> => {
  // Since we can't directly delete users without admin access,
  // we'll show a message that this feature requires admin service role
  throw new Error("Deleting users requires service_role key access in Supabase. This feature is not available in the current implementation.");
};
