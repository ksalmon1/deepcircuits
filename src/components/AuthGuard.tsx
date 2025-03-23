
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { UserRole } from "@/types/database";

type AuthGuardProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
  fallbackPath?: string;
};

/**
 * AuthGuard component handles authentication and authorization checks
 * 
 * @param children - The protected content
 * @param allowedRoles - Optional array of roles that are allowed to access the content
 * @param requireAuth - Whether authentication is required (defaults to true)
 * @param fallbackPath - Where to redirect if access is denied (defaults to "/login" or "/dashboard")
 */
export const AuthGuard = ({
  children,
  allowedRoles,
  requireAuth = true,
  fallbackPath,
}: AuthGuardProps) => {
  const { user } = useAuth();
  const { roles, isLoading: profileLoading } = useProfile();
  const [isVerifying, setIsVerifying] = useState(true);
  const location = useLocation();

  // Determine the appropriate fallback path
  const redirectPath = fallbackPath || (requireAuth ? "/login" : "/dashboard");

  useEffect(() => {
    // Complete verification when profile data is loaded
    if (!profileLoading) {
      setIsVerifying(false);
    }
  }, [profileLoading]);

  // Show loading state during verification
  if (isVerifying) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Verifying access...</span>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    console.log(`AuthGuard: Redirecting to ${redirectPath} - Not authenticated`);
    return <Navigate to={redirectPath} replace state={{ from: location }} />;
  }

  // If no role check is needed or no allowed roles specified, render children
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check role-based access
  const hasRequiredRole = allowedRoles.some(role => roles.includes(role));
  
  if (!hasRequiredRole) {
    console.log(`AuthGuard: Redirecting to ${redirectPath} - Missing required role`);
    console.log(`AuthGuard: User roles: ${roles.join(", ")}`);
    console.log(`AuthGuard: Required roles: ${allowedRoles.join(", ")}`);
    return <Navigate to={redirectPath} replace />;
  }

  // Access granted
  return <>{children}</>;
};
