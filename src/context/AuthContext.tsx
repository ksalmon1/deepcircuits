import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User, Provider } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { generateUniqueUsername } from "@/services/userService";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      setIsLoading(false);
    }
  }, [user]);

  const signUp = async (email: string, password: string, username?: string) => {
    setIsLoading(true);
    
    const metadata = username ? { display_name: username } : undefined;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      }
    });
    
    if (error) {
      toast.error(error.message || "Sign-up failed. Please try again.");
    }
    
    setIsLoading(false);
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message || "Sign-in failed. Please check your credentials.");
    } else {
      toast.success("Signed in successfully!");
    }

    setIsLoading(false);
    return { data, error };
  };

  const signInWithProvider = async (provider: Provider) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Social login error:", error);
      toast.error(error.message || "Social login failed. Please try again.");
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || "Sign-out failed.");
    } else {
      toast.info("Signed out.");
    }
    navigate("/login");
    setIsLoading(false);
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message || "Failed to send password reset email.");
    } else {
      toast.info("Password reset email sent. Please check your inbox.");
    }
    setIsLoading(false);
    return { data, error };
  };

  const value = {
    session,
    user,
    isLoading,
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
