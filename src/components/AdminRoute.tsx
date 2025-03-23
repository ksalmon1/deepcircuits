
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { Loader2 } from "lucide-react";

export const AdminRoute = ({ 
  children 
}: { 
  children: React.ReactNode 
}) => {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useProfile();

  console.log("AdminRoute - user:", user ? "authenticated" : "not authenticated");
  console.log("AdminRoute - isAdmin:", isAdmin());
  console.log("AdminRoute - isLoading:", isLoading);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  if (!user) {
    console.log("AdminRoute - redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    console.log("AdminRoute - redirecting to dashboard (not admin)");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("AdminRoute - rendering children (is admin)");
  return <>{children}</>;
};
