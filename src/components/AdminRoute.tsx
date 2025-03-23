
import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { Loader2 } from "lucide-react";

export const AdminRoute = ({ 
  children 
}: { 
  children: React.ReactNode 
}) => {
  const { user } = useAuth();
  const { isAdmin, isLoading: profileLoading } = useProfile();
  const [isReady, setIsReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Only set ready state when profile loading is complete
    if (!profileLoading) {
      setIsReady(true);
    }
  }, [profileLoading]);

  console.log("AdminRoute - user:", user ? "authenticated" : "not authenticated");
  console.log("AdminRoute - isAdmin:", isAdmin());
  console.log("AdminRoute - isLoading:", profileLoading);
  console.log("AdminRoute - current path:", location.pathname);

  // Show loading state while checking permissions
  if (profileLoading || !isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log("AdminRoute - redirecting to login");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Redirect to dashboard if authenticated but not admin
  if (!isAdmin()) {
    console.log("AdminRoute - redirecting to dashboard (not admin)");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("AdminRoute - rendering children (is admin)");
  return <>{children}</>;
};
