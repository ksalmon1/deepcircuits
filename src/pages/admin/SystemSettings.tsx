
import React, { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { useProfile } from "@/hooks/use-profile";
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
import { useToast } from "@/hooks/use-toast";
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
  const { isAdmin } = useProfile();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }

  // General Settings Form
  const generalForm = useForm({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      siteName: "DeepCircuits",
      logoUrl: "",
      maintenanceMode: false,
      debugMode: true,
      defaultTheme: "light",
    },
  });

  // Notification Settings Form
  const notificationForm = useForm({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      adminAlerts: true,
      errorReports: true,
      notificationEmail: "admin@circuitsim.com",
    },
  });

  // Security Settings Form
  const securityForm = useForm({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      loginAttempts: 5,
      sessionTimeout: 60,
      allowRegistration: true,
      enforceStrongPasswords: true,
      requireEmailVerification: true,
    },
  });

  // Backup Settings Form
  const backupForm = useForm({
    resolver: zodResolver(backupSettingsSchema),
    defaultValues: {
      autoBackup: true,
      backupFrequency: "daily",
      backupRetention: 7,
      backupLocation: "cloud-storage",
    },
  });

  const onSubmitGeneral = (data) => {
    console.log("General settings:", data);
    toast({
      title: "Settings Updated",
      description: "General settings have been saved successfully.",
    });
  };

  const onSubmitNotifications = (data) => {
    console.log("Notification settings:", data);
    toast({
      title: "Settings Updated",
      description: "Notification settings have been saved successfully.",
    });
  };

  const onSubmitSecurity = (data) => {
    console.log("Security settings:", data);
    toast({
      title: "Settings Updated",
      description: "Security settings have been saved successfully.",
    });
  };

  const onSubmitBackup = (data) => {
    console.log("Backup settings:", data);
    toast({
      title: "Settings Updated",
      description: "Backup settings have been saved successfully.",
    });
  };

  const triggerManualBackup = () => {
    toast({
      title: "Backup Started",
      description: "Manual backup has been initiated. This may take a few minutes.",
    });
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
              
              <TabsContent value="general">
                <Form {...generalForm}>
                  <form onSubmit={generalForm.handleSubmit(onSubmitGeneral)} className="space-y-6">
                    <FormField
                      control={generalForm.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Site Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            The name of your application shown to users
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={generalForm.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://example.com/logo.png" />
                          </FormControl>
                          <FormDescription>
                            URL to your application logo (leave empty to use the default)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={generalForm.control}
                      name="defaultTheme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Theme</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a theme" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Default theme for new users
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col gap-4">
                      <FormField
                        control={generalForm.control}
                        name="maintenanceMode"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Maintenance Mode</FormLabel>
                              <FormDescription>
                                Disable user access during maintenance periods
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={generalForm.control}
                        name="debugMode"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Debug Mode</FormLabel>
                              <FormDescription>
                                Enable detailed logging and error messages
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" className="flex gap-2">
                      <Save className="h-4 w-4" />
                      Save General Settings
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="notifications">
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onSubmitNotifications)} className="space-y-6">
                    <FormField
                      control={notificationForm.control}
                      name="notificationEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notification Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormDescription>
                            Email address for admin notifications
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex flex-col gap-4">
                      <FormField
                        control={notificationForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <FormDescription>
                                Send notification emails to users
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="adminAlerts"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Admin Alerts</FormLabel>
                              <FormDescription>
                                Send alerts to admins for important events
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={notificationForm.control}
                        name="errorReports"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Error Reports</FormLabel>
                              <FormDescription>
                                Send error reports to administrators
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" className="flex gap-2">
                      <Save className="h-4 w-4" />
                      Save Notification Settings
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="security">
                <Form {...securityForm}>
                  <form onSubmit={securityForm.handleSubmit(onSubmitSecurity)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={securityForm.control}
                        name="loginAttempts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Login Attempts</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                max={10} 
                                {...field} 
                                onChange={e => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum failed login attempts before timeout
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={securityForm.control}
                        name="sessionTimeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Session Timeout (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={5} 
                                max={240} 
                                {...field} 
                                onChange={e => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              How long until user sessions expire
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <FormField
                        control={securityForm.control}
                        name="allowRegistration"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Allow Registration</FormLabel>
                              <FormDescription>
                                Allow new users to register accounts
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={securityForm.control}
                        name="enforceStrongPasswords"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Enforce Strong Passwords</FormLabel>
                              <FormDescription>
                                Require complex passwords meeting security standards
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={securityForm.control}
                        name="requireEmailVerification"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Require Email Verification</FormLabel>
                              <FormDescription>
                                Users must verify email before accessing the platform
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" className="flex gap-2">
                      <Save className="h-4 w-4" />
                      Save Security Settings
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="backup">
                <Form {...backupForm}>
                  <form onSubmit={backupForm.handleSubmit(onSubmitBackup)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={backupForm.control}
                        name="backupFrequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Backup Frequency</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              How often automatic backups should run
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={backupForm.control}
                        name="backupRetention"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Backup Retention (days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                max={90} 
                                {...field} 
                                onChange={e => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              How long to keep backups before deletion
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={backupForm.control}
                        name="backupLocation"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Backup Location</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Storage location for backups (path or cloud identifier)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={backupForm.control}
                      name="autoBackup"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Automatic Backups</FormLabel>
                            <FormDescription>
                              Run backups automatically on schedule
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex flex-col gap-2">
                      <Separator className="my-4" />
                      <h3 className="text-lg font-medium">Manual Backup</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Initiate an immediate backup of all system data
                      </p>
                      <div className="flex gap-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex gap-2"
                          onClick={triggerManualBackup}
                        >
                          <Upload className="h-4 w-4" />
                          Start Backup Now
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex gap-2"
                        >
                          <DownloadCloud className="h-4 w-4" />
                          Download Latest Backup
                        </Button>
                      </div>
                    </div>
                    
                    <Button type="submit" className="flex gap-2">
                      <Save className="h-4 w-4" />
                      Save Backup Settings
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default SystemSettings;
