
import React from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import PageLayout from "@/components/layout/PageLayout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
  const navigate = useNavigate();

  console.log("AdminSettings: Rendering", { isAdmin: isAdmin ? isAdmin() : false, isLoading });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Loading Admin Dashboard...</h1>
        </div>
      </PageLayout>
    );
  }

  if (!user || !isAdmin()) {
    console.log("AdminSettings: Redirecting to /dashboard - Not an admin");
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

  const handleModuleClick = (path: string) => {
    console.log("Navigating to:", path);
    navigate(path);
  };

  return (
    <PageLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((module, index) => (
            <div
              key={index}
              onClick={() => handleModuleClick(module.link)}
              className="cursor-pointer"
            >
              <Card className="h-full hover:shadow-md transition-shadow">
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
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminSettings;
