import { supabase } from "@/integrations/supabase/client";
import { Profile, UserRole, UserStatus } from "@/types/database";
import { User } from "@supabase/supabase-js";
import { uniqueUsernameGenerator } from "unique-username-generator";

export type UserWithProfile = {
  id: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
};

// Custom dictionaries for username generation
const circuitTerms = [
  "resistor", "capacitor", "inductor", "diode", "transistor", 
  "circuit", "logic", "gate", "sensor", "relay", "switch",
  "board", "chip", "micro", "analog", "digital", "signal",
  "wire", "current", "voltage", "power", "phase", "led",
  "motor", "arduino", "pi", "nano", "mega", "uno", "byte"
];

const descriptors = [
  "awesome", "brilliant", "clever", "dynamic", "electric",
  "fast", "genius", "happy", "innovative", "jolly", "keen",
  "lively", "magical", "nimble", "original", "powerful",
  "quick", "rapid", "super", "talented", "unique", "vibrant",
  "wise", "xpert", "youthful", "zippy", "creative", "smart"
];

// Generate a unique username for new users
export const generateUniqueUsername = (): string => {
  return uniqueUsernameGenerator({
    dictionaries: [descriptors, circuitTerms],
    separator: "-",
    style: "capital",
    randomDigits: 2
  });
};

/**
 * Fetches user profile and roles for a given user ID
 * @param userId The user ID to fetch data for
 * @returns Object containing profile and roles
 */
export const getUserProfileAndRoles = async (userId: string): Promise<{
  profile: Profile | null;
  roles: UserRole[];
}> => {
  try {
    console.log("Fetching profile and roles for user:", userId);
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return { profile: null, roles: [] };
    }

    console.log("Profile loaded successfully");

    const { data: roleData, error: roleError } = await supabase
      .rpc('get_user_roles', { user_uuid: userId });
    
    if (roleError) {
      console.error("Error fetching roles:", roleError);
      return { profile: profileData as Profile, roles: [] };
    }

    const roleArray = Array.isArray(roleData) ? roleData : [];
    console.log("Roles loaded successfully:", roleArray);
    
    return { 
      profile: profileData as Profile, 
      roles: roleArray as UserRole[] 
    };
  } catch (error: any) {
    console.error("User data fetch error:", error);
    return { profile: null, roles: [] };
  }
};

// Get all users (using public schema instead of admin API)
export const getAllUsers = async (): Promise<UserWithProfile[]> => {
  try {
    console.log("Fetching user data from profiles and user_roles tables");
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');
      
    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      throw rolesError;
    }

    const users = profiles.map((profile) => {
      const roleRecord = userRoles?.find((r) => r.user_id === profile.id) || null;
      
      return {
        id: profile.id,
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    if (!profile) {
      return null;
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
      
    if (roleError && roleError.code !== 'PGRST116') {
      throw roleError;
    }
    
    return {
      id: profile.id,
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

/**
 * Update the user's profile
 * @param userId The user ID to update
 * @param updates The profile updates to apply
 * @returns Object indicating success and containing error or updated profile data
 */
export const updateProfile = async (
  userId: string,
  updates: Partial<Profile>
): Promise<{ success: boolean; error?: any; data?: Profile | null }> => {
  if (!userId) {
    console.error("User ID is required to update profile");
    return { 
      success: false, 
      error: new Error("User ID is required to update profile") 
    };
  }

  try {
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      return { success: false, error };
    }

    return { success: true, data: updatedProfile as Profile };
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return { success: false, error };
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

    const typedProfile: Profile = {
      ...profile,
      status: profile.status as UserStatus
    };

    return typedProfile;
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    throw error;
  }
};

// Update user role
export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
  try {
    const { data: existingRole, error: checkError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingRole) {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
        
      if (error) {
        console.error("Error updating user role:", error);
        throw error;
      }
    } else {
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
