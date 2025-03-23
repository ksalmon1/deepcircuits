
import { supabase } from "@/integrations/supabase/client";
import { Profile, UserRole, UserStatus } from "@/types/database";
import { User } from "@supabase/supabase-js";

export type UserWithProfile = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
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
    const users = profiles.map((profile) => {
      const roleRecord = userRoles?.find((r) => r.user_id === profile.id) || null;
      
      return {
        id: profile.id,
        email: profile.display_name?.includes('@') ? profile.display_name : `${profile.display_name || 'user'}@example.com`,
        name: profile.display_name || 'Unknown',
        role: (roleRecord?.role as UserRole) || 'user',
        status: (profile.status as UserStatus) || 'active',
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
      status: (profile.status as UserStatus) || 'active',
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
  data: { display_name?: string; avatar_url?: string; status?: UserStatus }
): Promise<Profile> => {
  try {
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
      console.error("Error updating user profile:", error);
      throw error;
    }

    return profile;
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    throw error;
  }
};

// Update user role
export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  try {
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
        console.error("Error updating user role:", error);
        throw error;
      }
    } else {
      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
        
      if (error) {
        console.error("Error inserting user role:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    throw error;
  }
};

// Create a new user with Supabase Auth API and set up profile
export const createUser = async (
  email: string, 
  password: string, 
  userData: { 
    display_name?: string; 
    role?: UserRole;
    status?: UserStatus;
  }
): Promise<string> => {
  try {
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error("Error creating user in Auth:", authError);
      // Try fallback method for public API
      return createUserPublic(email, password, userData);
    }

    const userId = authData.user.id;

    // Update the profile (created via trigger)
    if (userData.display_name) {
      try {
        await updateUserProfile(userId, { 
          display_name: userData.display_name,
          status: userData.status || 'active'
        });
      } catch (profileError) {
        console.error("Error updating profile for new user:", profileError);
        // Continue anyway since the user was created
      }
    }

    // Set user role if provided
    if (userData.role) {
      try {
        await updateUserRole(userId, userData.role);
      } catch (roleError) {
        console.error("Error setting role for new user:", roleError);
        // Continue anyway since the user was created
      }
    }

    return userId;
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
};

// Fallback method using public API (for demo purposes)
const createUserPublic = async (
  email: string, 
  password: string, 
  userData: { 
    display_name?: string; 
    role?: UserRole;
    status?: UserStatus;
  }
): Promise<string> => {
  try {
    // For demo purposes - create a fake user ID
    // In a production app, you would need to use the service_role key
    const fakeUserId = crypto.randomUUID();
    
    // Insert directly into profiles table (bypassing auth)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: fakeUserId,
        display_name: userData.display_name || email,
        status: userData.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (profileError) {
      console.error("Error creating profile:", profileError);
      throw profileError;
    }
    
    // Insert user role if provided
    if (userData.role) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: fakeUserId,
          role: userData.role
        });
        
      if (roleError) {
        console.error("Error creating user role:", roleError);
        // Continue anyway
      }
    }
    
    return fakeUserId;
  } catch (error) {
    console.error("Error in createUserPublic:", error);
    throw new Error("Failed to create user through public API. This is a demo limitation - in production you would need to use the service_role key.");
  }
};

// Delete a user
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    // Try to delete user with admin API
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error("Error deleting user from Auth:", authError);
      // Fallback to just removing from profiles table for demo
      await deleteUserPublic(userId);
      return;
    }
    
    // RLS will cascade delete related records in profiles and user_roles
  } catch (error) {
    console.error("Error in deleteUser:", error);
    throw error;
  }
};

// Fallback method for demo purposes
const deleteUserPublic = async (userId: string): Promise<void> => {
  try {
    // Delete from profiles first
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
      
    if (profileError) {
      console.error("Error deleting profile:", profileError);
      throw profileError;
    }
    
    // Delete from user_roles too
    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
      
    if (roleError) {
      console.error("Error deleting user role:", roleError);
      // Continue anyway
    }
  } catch (error) {
    console.error("Error in deleteUserPublic:", error);
    throw new Error("Failed to delete user through public API. This is a demo limitation - in production you would need to use the service_role key.");
  }
};
