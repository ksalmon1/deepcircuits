import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User, Provider } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Profile, UserRole } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  isAdmin: () => boolean;
  hasRole: (role: UserRole) => boolean;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<{
    error: any | null;
    data: any | null;
  }>;
  signIn: (email: string, password: string) => Promise<{
    error: any | null;
    data: any | null;
  }>;
  signInWithProvider: (provider: Provider) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{
    error: any | null;
    data: any | null;
  }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchUserData = async (userId: string) => {
    try {
      console.log("Fetching profile and roles for user:", userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        throw profileError;
      }

      setProfile(profileData as Profile);
      console.log("Profile loaded successfully");

      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_roles', { user_uuid: userId });
      
      if (roleError) {
        console.error("Error fetching roles:", roleError);
        setRoles([]);
      } else {
        const roleArray = Array.isArray(roleData) ? roleData : [];
        console.log("Roles loaded successfully:", roleArray);
        setRoles(roleArray as UserRole[]);
      }
    } catch (error: any) {
      console.error("User data fetch error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch user data",
      });
      setProfile(null);
      setRoles([]);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  useEffect(() => {
    if (user && profile) {
      setIsLoading(false);
    }
  }, [user, profile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      throw new Error("User must be logged in to update profile");
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setProfile(prev => prev ? { ...prev, ...updates } : null);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    }
  };

  const signUp = async (email: string, password: string, username?: string) => {
    setIsLoading(true);
    
    const metadata = username ? { display_name: username } : undefined;
    
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      }
    });
    
    if (response.data.user && !response.error) {
      try {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ 
            user_id: response.data.user.id, 
            role: 'user' as UserRole 
          });
          
        if (roleError) {
          console.error("Error setting default user role:", roleError);
        }
      } catch (error) {
        console.error("Failed to set default user role:", error);
      }
    }
    
    setIsLoading(false);
    return response;
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    return response;
  };

  const signInWithProvider = async (provider: Provider) => {
    setIsLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
    } catch (error) {
      console.error("Social login error:", error);
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    navigate("/login");
    setIsLoading(false);
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    const response = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    return response;
  };

  const hasRole = (role: UserRole) => roles.includes(role);

  const isAdmin = () => hasRole('admin');

  const value = {
    session,
    user,
    profile,
    roles,
    isLoading,
    isAdmin,
    hasRole,
    updateProfile,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
