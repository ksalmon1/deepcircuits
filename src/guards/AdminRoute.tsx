
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useProfile();
  const location = useLocation();
  
  console.log("AdminRoute: Checking admin status", { isLoading, user: !!user, isAdmin: isAdmin ? isAdmin() : false });
  
  // Show loading state while checking admin status
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Verifying admin access...</span>
      </div>
    );
  }
  
  // Check if user is logged in and has admin role
  if (!user || !isAdmin()) {
    console.log("AdminRoute: Redirecting to /dashboard - Not an admin");
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }
  
  // User is an admin, render children
  console.log("AdminRoute: User is admin, rendering children");
  return <>{children}</>;
};
