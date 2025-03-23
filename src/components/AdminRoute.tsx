
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
  const { adminStatus, isLoading, rolesLoaded } = useProfile();
  const [hasCheckedPermission, setHasCheckedPermission] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Only mark permissions as checked when loading is complete and roles are loaded
    if (!isLoading && rolesLoaded) {
      setHasCheckedPermission(true);
    }
  }, [isLoading, rolesLoaded]);

  // Show loading state until all permission checks are complete
  if (isLoading || !hasCheckedPermission) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Verifying permissions...</span>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log("AdminRoute - redirecting to login (not authenticated)");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Redirect to dashboard if authenticated but not admin
  if (!adminStatus) {
    console.log("AdminRoute - redirecting to dashboard (not admin)");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("AdminRoute - rendering children (is admin)");
  return <>{children}</>;
};
