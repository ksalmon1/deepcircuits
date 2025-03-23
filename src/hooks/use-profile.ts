
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Profile, UserRole } from "@/types/database";
import { useToast } from "./use-toast";

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setRoles([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          throw profileError;
        }

        setProfile(profileData as Profile);

        // Use the RPC function to get user roles
        const { data: roleData, error: roleError } = await supabase
          .rpc('get_user_roles', { user_uuid: user.id });
        
        if (roleError) {
          console.error("Error fetching roles:", roleError);
          setRoles([]);
        } else {
          console.log("Successfully fetched roles:", roleData);
          // Convert response to array if it's not already
          const roleArray = Array.isArray(roleData) ? roleData : [];
          setRoles(roleArray as UserRole[]);
        }
      } catch (error: any) {
        console.error("Profile fetch error:", error);
        toast({
          variant: "destructive",
          title: "Profile Error",
          description: error.message || "Failed to fetch profile data",
        });
        // Still set empty data to avoid leaving the app in a loading state
        setProfile(null);
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to update your profile",
      });
      return { error: new Error("Not authenticated"), data: null };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select();

      if (error) {
        throw error;
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update profile",
      });
      return { error, data: null };
    }
  };

  // Check if user has a specific role
  const hasRole = (role: UserRole) => {
    return roles.includes(role);
  };

  // Check if user is admin
  const isAdmin = () => {
    return hasRole('admin');
  };

  return {
    profile,
    roles,
    isLoading,
    updateProfile,
    hasRole,
    isAdmin,
  };
};
