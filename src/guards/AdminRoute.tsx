
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
  const { isAdmin, isLoading, error } = useProfile();
  const location = useLocation();
  
  // 1. Handle Loading
  if (isLoading) {
    console.log("AdminRoute: Waiting, profile loading...");
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Verifying admin access...</span>
      </div>
    );
  }
  
  // 2. Handle Error (Optional but Recommended)
  if (error) {
    console.error("AdminRoute: Error loading profile, redirecting", error);
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }
  
  // 3. Final Decision (Only if not loading and no error)
  if (user && isAdmin()) {
    console.log("AdminRoute: Access granted.");
    return <>{children}</>;
  } else {
    console.log("AdminRoute: Access denied, redirecting.");
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }
};
