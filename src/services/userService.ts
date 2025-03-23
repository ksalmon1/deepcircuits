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

// Get all users (admin only)
export const getAllUsers = async (): Promise<UserWithProfile[]> => {
  try {
    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw authError;
    }
    
    if (!authUsers?.users?.length) {
      return [];
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      throw profilesError;
    }

    // Get all user roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');
      
    if (rolesError) {
      throw rolesError;
    }

    // Map auth users with their profiles and roles
    return authUsers.users.map((user: User) => {
      const profile = profiles?.find((p: Profile) => p.id === user.id) || null;
      const role = userRoles?.find((r) => r.user_id === user.id)?.role || 'user';
      
      // Check if user is disabled/banned
      const userMetadata = user.user_metadata || {};
      const isDisabled = userMetadata.disabled === true || user.email_confirmed_at === null;
      
      return {
        id: user.id,
        email: user.email || '',
        name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
        role: role as UserRole,
        status: isDisabled ? 'inactive' as const : 'active' as const,
        created_at: user.created_at || new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<UserWithProfile | null> => {
  try {
    // Get user from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser?.user) {
      throw authError || new Error("User not found");
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError && profileError.code !== 'PGRST116') { // Not found is okay
      throw profileError;
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

    const user = authUser.user;
    const userMetadata = user.user_metadata || {};
    const isDisabled = userMetadata.disabled === true || user.email_confirmed_at === null;
    
    return {
      id: user.id,
      email: user.email || '',
      name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
      role: (roleData?.role as UserRole) || 'user',
      status: isDisabled ? 'inactive' : 'active',
      created_at: user.created_at || new Date().toISOString(),
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
export const updateUserStatus = async (userId: string, status: 'active' | 'inactive'): Promise<void> => {
  const { error } = await supabase.auth.admin.updateUserById(
    userId,
    { user_metadata: { disabled: status === 'inactive' } }
  );

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

// Create a new user (admin only)
export const createUser = async (
  email: string, 
  password: string, 
  userData: { 
    display_name?: string; 
    role?: UserRole; 
  }
): Promise<string> => {
  // Create the user in auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError || !authData?.user) {
    throw authError || new Error("Failed to create user");
  }

  const userId = authData.user.id;

  // Update profile if needed
  if (userData.display_name) {
    try {
      await updateUserProfile(userId, { display_name: userData.display_name });
    } catch (error) {
      console.error("Error updating profile for new user:", error);
      // Continue anyway, profile was created by trigger
    }
  }

  // Assign role if specified
  if (userData.role) {
    try {
      await updateUserRole(userId, userData.role);
    } catch (error) {
      console.error("Error assigning role to new user:", error);
      // Continue anyway
    }
  }

  return userId;
};

// Delete a user (admin only)
export const deleteUser = async (userId: string): Promise<void> => {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  
  if (error) {
    throw error;
  }
};
