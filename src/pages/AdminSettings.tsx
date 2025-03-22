
import React from "react";
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { useProfile } from "@/hooks/use-profile";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Cog, Database } from "lucide-react";

const AdminSettings = () => {
  const { user } = useAuth();
  const { isAdmin } = useProfile();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <PageLayout>
      <div className="container py-12">
        <div className="mb-8 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Settings</h1>
        </div>

        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">
            Welcome to the admin panel. Here you can manage users, system settings, and more.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage users, permissions and roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-slate-600">
                Add, edit or deactivate user accounts. Manage user roles and permissions.
              </p>
              <Button asChild>
                <Link to="/admin/users">Manage Users</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5 text-primary" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure global application settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-slate-600">
                Configure application-wide settings, logging preferences, and more.
              </p>
              <Button asChild>
                <Link to="/admin/system">System Configuration</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Component Library
              </CardTitle>
              <CardDescription>
                Manage the circuit component library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-slate-600">
                Add, edit or remove components from the library. Configure component properties.
              </p>
              <Button asChild>
                <Link to="/admin/components">Manage Components</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminSettings;
