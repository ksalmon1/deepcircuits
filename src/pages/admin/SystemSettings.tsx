import React, { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Cog, 
  Save, 
  Bell, 
  Monitor, 
  Upload, 
  Mail, 
  Shield, 
  Database, 
  DownloadCloud
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const generalSettingsSchema = z.object({
  siteName: z.string().min(3, "Site name must be at least 3 characters"),
  logoUrl: z.string().url("Must be a valid URL").or(z.string().length(0)),
  maintenanceMode: z.boolean(),
  debugMode: z.boolean(),
  defaultTheme: z.enum(["light", "dark", "system"]),
});

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  adminAlerts: z.boolean(),
  errorReports: z.boolean(),
  notificationEmail: z.string().email("Must be a valid email"),
});

const securitySettingsSchema = z.object({
  loginAttempts: z.number().min(1).max(10),
  sessionTimeout: z.number().min(5).max(240),
  allowRegistration: z.boolean(),
  enforceStrongPasswords: z.boolean(),
  requireEmailVerification: z.boolean(),
});

const backupSettingsSchema = z.object({
  autoBackup: z.boolean(),
  backupFrequency: z.enum(["daily", "weekly", "monthly"]),
  backupRetention: z.number().min(1).max(90),
  backupLocation: z.string().min(3),
});

const SystemSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleSave = (category: string, settings: Record<string, unknown>) => {
    console.log(`Saving ${category} settings:`, settings);
    toast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully!`);
  };

  return (
    <PageLayout>
      <div className="container py-12">
        <div className="mb-8 flex items-center gap-3">
          <Cog className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">System Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Global Configuration</CardTitle>
            <CardDescription>
              Configure system-wide settings for the DeepCircuits application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6 grid grid-cols-4 w-full">
                <TabsTrigger value="general" className="flex items-center justify-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span>General</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center justify-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Security</span>
                </TabsTrigger>
                <TabsTrigger value="backup" className="flex items-center justify-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Backup</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default SystemSettings;
