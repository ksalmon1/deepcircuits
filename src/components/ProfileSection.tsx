import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CircuitBoard, 
  FileText, 
  Lock, 
  Shield, 
  User, 
  CreditCard, 
  Bell, 
  Trash2, 
  LogOut, 
  CheckCircle2, 
  Users, 
  Cog, 
  Database 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "react-router-dom";

interface PlanDetails {
  name: string;
  price?: string;
  interval: string;
  features: string[];
  isPopular?: boolean;
  isDisabled?: boolean;
}

const profileFormSchema = z.object({
  display_name: z
    .string()
    .min(2, {
      message: "Display name must be at least 2 characters.",
    })
    .max(30, {
      message: "Display name cannot be longer than 30 characters.",
    }),
  avatar_url: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const ProfileSection = () => {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, roles, isAdmin } = useProfile();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans: PlanDetails[] = [
    {
      name: "Free",
      price: "0",
      interval: "forever",
      features: [
        "5 projects",
        "Basic components",
        "Community support",
        "24 hour simulation time limit"
      ],
      isPopular: false,
    },
    {
      name: "Pro",
      price: "12",
      interval: "month",
      features: [
        "Unlimited projects",
        "All components",
        "Priority support",
        "Version history",
        "No simulation time limits",
        "Export projects"
      ],
      isPopular: true,
    },
    {
      name: "Enterprise",
      price: "49",
      interval: "month",
      features: [
        "Everything in Pro",
        "SSO Authentication",
        "Dedicated support",
        "Custom component library",
        "Team collaboration"
      ],
      isDisabled: true,
    }
  ];

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: "",
      avatar_url: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        display_name: profile.display_name || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile, user, form]);

  function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);

    updateProfile({
      display_name: data.display_name,
      avatar_url: data.avatar_url,
    })
      .then(() => {
        setIsLoading(false);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      })
      .catch((error) => {
        console.error("Error updating profile:", error);
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "There was an error updating your profile.",
        });
      });
  }

  const handleDeleteAccount = () => {
    // For now, just show a toast. In a real app, this would trigger a confirmation dialog
    toast({
      variant: "destructive",
      title: "Delete account",
      description: "This feature is not implemented yet.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Manage your personal information and account settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="flex items-center gap-6 mb-6">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile?.avatar_url || ""} alt={profile?.display_name || ""} />
                      <AvatarFallback className="text-lg">
                        {profile?.display_name ? profile.display_name[0].toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-medium">{profile?.display_name}</h3>
                      <p className="text-sm text-slate-500">Account ID: {user?.id?.substring(0, 8)}...</p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your display name" {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the name that will be displayed to other users.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="avatar_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avatar URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/avatar.png" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the URL of your avatar image.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center gap-4">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            <div className="w-full md:w-64 space-y-6">
              <div className="border rounded-md p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">User</Badge>
                  {isAdmin() && (
                    <Badge variant="secondary">Admin</Badge>
                  )}
                </div>
                
                <Separator />
                
                <div className="text-sm">
                  <div className="font-medium">Account Created</div>
                  <div className="text-slate-500">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString() 
                      : "Unknown"}
                  </div>
                </div>
              </div>

              {isAdmin() && (
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
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="subscription">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 md:grid-cols-3">
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden md:inline">Subscription</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden md:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-destructive" />
            <span className="hidden md:inline">Danger Zone</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-lg">Current Plan: Free</h3>
                      <p className="text-sm text-slate-500">
                        You are currently on the free plan.
                      </p>
                    </div>
                    <Badge variant="outline">Free</Badge>
                  </div>
                </div>

                <h3 className="text-lg font-medium pt-4">Available Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <div 
                      key={plan.name}
                      className={`border rounded-md p-4 relative ${
                        plan.isPopular ? "ring-2 ring-primary" : ""
                      } ${plan.isDisabled ? "opacity-60" : ""}`}
                    >
                      {plan.isPopular && (
                        <Badge className="absolute -top-2 -right-2">Popular</Badge>
                      )}
                      <h3 className="font-medium text-lg">{plan.name}</h3>
                      <div className="flex items-end gap-1 my-2">
                        <span className="text-2xl font-bold">${plan.price || '0'}</span>
                        <span className="text-slate-500">/{plan.interval}</span>
                      </div>
                      <Separator className="my-3" />
                      <ul className="space-y-2 my-4">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className="w-full" 
                        variant={plan.name === "Free" ? "outline" : "default"}
                        disabled={plan.isDisabled || plan.name === "Free"}
                        onClick={() => setSelectedPlan(plan.name)}
                      >
                        {plan.name === "Free" ? "Current Plan" : plan.isDisabled ? "Coming Soon" : "Upgrade"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdmin() && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>
                  Manage administrative features and settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">User Management</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      Manage users, permissions and roles.
                    </p>
                    <Button variant="outline" className="mt-2" asChild>
                      <a href="/admin/users">Manage Users</a>
                    </Button>
                  </div>

                  <div className="border rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Cog className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">System Settings</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      Configure global application settings
                    </p>
                    <Button variant="outline" className="mt-2" asChild>
                      <a href="/admin/system">System Configuration</a>
                    </Button>
                  </div>

                  <div className="border rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Component Library</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      Manage the circuit component library
                    </p>
                    <Button variant="outline" className="mt-2" asChild>
                      <a href="/admin/components">Manage Components</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Change Password</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                  </div>
                  <Button>Change Password</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                <p className="text-sm text-slate-500">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>
                <Button variant="outline">Enable 2FA</Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Active Sessions</h3>
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-sm text-slate-500">Last active: Just now</p>
                    </div>
                    <Badge variant="outline">Current</Badge>
                  </div>
                </div>
                <Button variant="outline">Log Out All Other Sessions</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-destructive/20 rounded-md p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Delete Account</h3>
                  <p className="text-sm text-slate-500">
                    Once you delete your account, there is no going back. This action is irreversible.
                  </p>
                </div>
                <div className="flex gap-4">
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="border rounded-md p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Sign Out</h3>
                  <p className="text-sm text-slate-500">
                    Sign out of your account across all devices.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileSection;
