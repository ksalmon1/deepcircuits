
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const ProtectedRoute = ({ 
  children 
}: { 
  children: React.ReactNode 
}) => {
  const { user, isLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setIsChecking(false);
    }
  }, [isLoading]);

  if (isChecking) {
    // You could show a loading spinner here
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const PublicOnlyRoute = ({ 
  children 
}: { 
  children: React.ReactNode 
}) => {
  const { user, isLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setIsChecking(false);
    }
  }, [isLoading]);

  if (isChecking) {
    // You could show a loading spinner here
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
