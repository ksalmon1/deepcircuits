
import { AuthGuard } from "./AuthGuard";

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  return (
    <AuthGuard allowedRoles={['admin']} fallbackPath="/dashboard">
      {children}
    </AuthGuard>
  );
};
