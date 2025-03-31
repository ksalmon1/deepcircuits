
import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import PageLayout from "@/components/layout/PageLayout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Users, 
  Settings, 
  Database,
  Cpu
} from "lucide-react";

const AdminSettings = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useProfile();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Show loading state while checking admin status
  if (isLoading) {
    return (
      <PageLayout>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Loading Admin Dashboard...</h1>
        </div>
      </PageLayout>
    );
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  const adminModules = [
    {
      title: "User Management",
      description: "Manage users, roles, and permissions",
      icon: <Users className="h-8 w-8" />,
      link: "/admin/users",
      color: "bg-blue-500"
    },
    {
      title: "System Settings",
      description: "Configure application-wide settings",
      icon: <Settings className="h-8 w-8" />,
      link: "/admin/system",
      color: "bg-purple-500"
    },
    {
      title: "Component Admin",
      description: "Manage circuit components available to users",
      icon: <Cpu className="h-8 w-8" />,
      link: "/admin/components",
      color: "bg-green-500"
    },
    {
      title: "Database Backups",
      description: "Manage database backups and restoration",
      icon: <Database className="h-8 w-8" />,
      link: "/admin/database",
      color: "bg-amber-500"
    }
  ];

  return (
    <PageLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((module, index) => (
            <Link key={index} to={module.link} className="no-underline">
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className={`${module.color} text-white rounded-t-lg`}>
                  <div className="flex justify-between items-center">
                    {module.icon}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <CardTitle className="mb-2">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminSettings;
