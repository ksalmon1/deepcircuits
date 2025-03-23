
import { AuthGuard } from "./AuthGuard";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthGuard requireAuth={true}>
      {children}
    </AuthGuard>
  );
};

export const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthGuard requireAuth={false} fallbackPath="/dashboard">
      {children}
    </AuthGuard>
  );
};
