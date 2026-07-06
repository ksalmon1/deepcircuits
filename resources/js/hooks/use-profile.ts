import { useAuth } from '@/context/AuthContext';
import { AuthUser } from '@/types/auth';

/**
 * Profile data now comes straight from the shared Inertia auth prop;
 * this hook keeps the previous call-sites working.
 */
export const useProfile = () => {
  const { user, isAdmin } = useAuth();

  return {
    profile: user,
    roles: user ? [user.role] : [],
    isLoading: false,
    error: null as Error | null,
    hasRole: (role: string) => user?.role === role,
    isAdmin: () => isAdmin,
    setProfileData: (_profile: AuthUser) => {
      // Server state is refreshed via Inertia after profile updates.
    },
  };
};
