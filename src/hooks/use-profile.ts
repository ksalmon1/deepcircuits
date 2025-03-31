
import { useAuth } from "@/context/AuthContext";
import { Profile } from "@/types/database";
import { getUserProfileAndRoles } from "@/services/userService";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * This hook provides access to the user profile data and roles
 */
export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setProfile(null);
        setRoles([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { profile: userProfile, roles: userRoles } = await getUserProfileAndRoles(user.id);
        console.log(`Roles loaded successfully: ${JSON.stringify(userRoles)}`);
        setProfile(userProfile);
        setRoles(userRoles);
        setError(null);
      } catch (err) {
        console.error("Error in useProfile hook:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  /**
   * Check if the user has a specific role
   */
  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  /**
   * Check if the user is an admin
   */
  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  /**
   * Update the user's profile
   */
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { 
        success: false, 
        error: new Error("User must be logged in to update profile") 
      };
    }

    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        return { success: false, error };
      }

      setProfile(updatedProfile as Profile);
      return { success: true };
    } catch (error) {
      console.error("Error in updateProfile:", error);
      return { success: false, error };
    }
  };

  return {
    profile,
    roles,
    isLoading,
    error,
    hasRole,
    isAdmin,
    updateProfile,
  };
};
