import React, { createContext, useContext } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AuthUser, SharedPageProps } from '@/types/auth';

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth state is owned by Laravel and shared on every Inertia response
 * (HandleInertiaRequests::share). This provider just exposes it in the
 * shape the rest of the app already consumes.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { auth } = usePage<SharedPageProps>().props;

  const value: AuthContextType = {
    user: auth?.user ?? null,
    isLoading: false,
    isAdmin: auth?.user?.role === 'admin',
    signOut: () => router.post('/logout'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
