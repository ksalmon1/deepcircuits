
import React from "react";
import { Link } from '@/lib/router';
import { Shield, Users, Cog, Database } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const AdminLinks: React.FC = () => {
  return (
    <div className="border rounded-md p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Admin Settings</h3>
      </div>
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <Link to="/admin/users" className="text-sm text-primary hover:underline">
            User Management
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Cog className="h-4 w-4" />
          <Link to="/admin/system" className="text-sm text-primary hover:underline">
            System Configuration
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <Link to="/admin/components" className="text-sm text-primary hover:underline">
            Component Library
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLinks;
