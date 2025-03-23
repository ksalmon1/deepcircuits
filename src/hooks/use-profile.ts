
import { useAuth } from "@/context/AuthContext";
import { Profile } from "@/types/database";

/**
 * This hook provides access to the user profile data from AuthContext
 * to maintain backward compatibility with existing components
 */
export const useProfile = () => {
  const { profile, roles, isLoading, hasRole, isAdmin, updateProfile } = useAuth();

  return {
    profile,
    roles,
    isLoading,
    hasRole,
    isAdmin,
    updateProfile,
  };
};
