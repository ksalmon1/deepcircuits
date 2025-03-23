
import React, { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Mail, Calendar, Shield, Image, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const profileFormSchema = z.object({
  display_name: z
    .string()
    .min(2, { message: "Display name must be at least 2 characters." })
    .max(30, { message: "Display name cannot exceed 30 characters." }),
  avatar_url: z
    .string()
    .url({ message: "Please enter a valid URL." })
    .or(z.string().length(0))
    .optional(),
  bio: z
    .string()
    .max(160, { message: "Bio cannot exceed 160 characters." })
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

type PlanTier = 'free' | 'standard' | 'professional';

interface PlanDetails {
  name: string;
  price: string;
  interval: string;
  features: string[];
  isPopular?: boolean;
  isCurrent?: boolean;
}

const planDetails: Record<PlanTier, PlanDetails> = {
  free: {
    name: "Free",
    price: "$0",
    interval: "forever",
    features: [
      "Basic circuit editing",
      "Limited component library",
      "Public projects only",
      "Community support"
    ]
  },
  standard: {
    name: "Standard",
    price: "$9.99",
    interval: "per month",
    isPopular: true,
    features: [
      "Advanced circuit editing",
      "Full component library",
      "Private projects",
      "Version history",
      "Email support"
    ]
  },
  professional: {
    name: "Professional",
    price: "$29.99",
    interval: "per month",
    features: [
      "Everything in Standard",
      "Team collaboration",
      "Custom components",
      "Priority support",
      "Advanced simulation features"
    ]
  }
};

const ProfileSection = () => {
  const { profile, roles, isLoading, updateProfile } = useProfile();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: profile?.display_name || "",
      avatar_url: profile?.avatar_url || "",
      bio: "",
    },
    mode: "onChange",
  });
  
  const isSubmitting = form.formState.isSubmitting;

  const currentPlanTier: PlanTier = "free";
  
  const usageData = {
    projects: { current: 3, limit: 5 },
    storage: { current: 45, limit: 100 },
    components: { current: 12, limit: 20 }
  };

  React.useEffect(() => {
    if (profile) {
      form.reset({
        display_name: profile.display_name || "",
        avatar_url: profile.avatar_url || "",
        bio: "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile({
        display_name: values.display_name,
        avatar_url: values.avatar_url,
      });
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
      });
    }
  };

  const handleSubscriptionChange = (plan: PlanTier) => {
    if (plan === currentPlanTier) {
      toast({
        title: "Already Subscribed",
        description: `You are already on the ${planDetails[plan].name} plan.`,
      });
      return;
    }

    toast({
      title: "Subscription Change",
      description: `Upgrading to ${planDetails[plan].name} plan would go to payment processing in the full app.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>You need to be logged in to view your profile.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown";

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>
          Manage your account information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            {roles.includes('admin') && (
              <TabsTrigger value="admin">Admin Settings</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="profile">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Avatar className="h-24 w-24 border-2 border-border">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.display_name || "User"} />
                  ) : (
                    <AvatarFallback className="text-4xl">
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="space-y-2 flex-1">
                  <h3 className="text-xl font-semibold">{profile.display_name || "Unnamed User"}</h3>
                  <div className="flex items-center text-muted-foreground">
                    <Mail className="mr-2 h-4 w-4" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Joined on {joinDate}</span>
                  </div>
                  {roles.length > 0 && (
                    <div className="flex items-center text-muted-foreground">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Roles: {roles.join(", ")}</span>
                    </div>
                  )}
                  <div className="mt-2">
                    <Badge variant={currentPlanTier === 'free' ? "outline" : "secondary"}>
                      {planDetails[currentPlanTier].name} Plan
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
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
                            <Input placeholder="https://example.com/avatar.jpg" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter a URL to an image to use as your avatar.
                          </FormDescription>
                          <FormMessage />
                          {field.value && (
                            <div className="flex justify-center mt-4">
                              <Avatar className="h-20 w-20">
                                <AvatarImage src={field.value} alt="Preview" />
                                <AvatarFallback>
                                  <User className="h-8 w-8" />
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="account">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Account Information</h3>
                <p className="text-muted-foreground">
                  Your account details and email preferences
                </p>
              </div>
              
              <div className="grid gap-4">
                <div className="border rounded-md p-4">
                  <h4 className="font-medium">Email Address</h4>
                  <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                </div>
                
                <div className="border rounded-md p-4">
                  <h4 className="font-medium">Account Created</h4>
                  <p className="text-sm text-muted-foreground mt-1">{joinDate}</p>
                </div>
                
                <div className="border rounded-md p-4">
                  <h4 className="font-medium">Password</h4>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-muted-foreground">•••••••••••••••</p>
                    <Button variant="outline" size="sm">Change Password</Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <h3 className="text-lg font-medium">Danger Zone</h3>
                <p className="text-muted-foreground">
                  Permanently delete your account and all associated data
                </p>
                <div className="mt-2">
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="subscription">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Subscription Management</h3>
                <p className="text-muted-foreground">
                  View and manage your subscription plan and usage
                </p>
              </div>
              
              <div className="border rounded-md p-5 bg-muted/10">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-semibold flex items-center">
                      Current Plan: {planDetails[currentPlanTier].name}
                      {currentPlanTier !== 'free' && (
                        <Badge variant="outline" className="ml-2">Active</Badge>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentPlanTier === 'free' ? 
                        "Free plan with limited features" : 
                        "Your subscription renews on the 15th of each month"}
                    </p>
                  </div>
                  {currentPlanTier !== 'free' && (
                    <Button variant="outline" size="sm">
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Usage Statistics</h4>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Projects</span>
                      <span className="text-sm text-muted-foreground">
                        {usageData.projects.current} / {usageData.projects.limit}
                      </span>
                    </div>
                    <Progress 
                      value={(usageData.projects.current / usageData.projects.limit) * 100} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Storage Used (MB)</span>
                      <span className="text-sm text-muted-foreground">
                        {usageData.storage.current} / {usageData.storage.limit}
                      </span>
                    </div>
                    <Progress 
                      value={(usageData.storage.current / usageData.storage.limit) * 100} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Custom Components</span>
                      <span className="text-sm text-muted-foreground">
                        {usageData.components.current} / {usageData.components.limit}
                      </span>
                    </div>
                    <Progress 
                      value={(usageData.components.current / usageData.components.limit) * 100} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t">
                <h4 className="font-medium mb-4">Available Plans</h4>
                
                <div className="grid gap-4 md:grid-cols-3">
                  {(Object.entries(planDetails) as [PlanTier, PlanDetails][]).map(([key, plan]) => {
                    const planKey = key as PlanTier;
                    const isCurrent = planKey === currentPlanTier;
                    
                    return (
                      <Card key={planKey} className={`border ${plan.isPopular ? 'border-primary' : ''} ${isCurrent ? 'bg-muted/20' : ''}`}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            {plan.isPopular && (
                              <Badge className="bg-primary text-white">Popular</Badge>
                            )}
                          </div>
                          <div className="flex items-end gap-1">
                            <span className="text-2xl font-bold">
                              {plan.price ? plan.price.replace('$', '') : '0'}
                            </span>
                            <span className="text-sm text-muted-foreground mb-1">{plan.interval}</span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {plan.features.map((feature, i) => (
                              <li key={i} className="flex">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                                <span className="text-sm">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                        <CardFooter>
                          <Button 
                            variant={isCurrent ? "outline" : plan.isPopular ? "default" : "secondary"} 
                            className="w-full"
                            disabled={isCurrent}
                            onClick={() => handleSubscriptionChange(planKey)}
                          >
                            {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
              
              <div className="pt-6 border-t">
                <h4 className="font-medium mb-4">Payment History</h4>
                {currentPlanTier === 'free' ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No payment history available on the free plan.</p>
                  </div>
                ) : (
                  <div className="border rounded-md divide-y">
                    <div className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">Invoice #2345</p>
                        <p className="text-sm text-muted-foreground">Oct 15, 2023</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{planDetails[currentPlanTier].price.replace('$', '')}</p>
                        <Badge variant="outline" className="bg-green-50">Paid</Badge>
                      </div>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">Invoice #2344</p>
                        <p className="text-sm text-muted-foreground">Sep 15, 2023</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{planDetails[currentPlanTier].price.replace('$', '')}</p>
                        <Badge variant="outline" className="bg-green-50">Paid</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {roles.includes('admin') && (
            <TabsContent value="admin">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Admin Panel</h3>
                  <p className="text-muted-foreground">
                    Special settings available to administrators
                  </p>
                </div>
                
                <div className="grid gap-4">
                  <div className="border rounded-md p-4">
                    <h4 className="font-medium">User Management</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage users and their permissions
                    </p>
                    <Button variant="outline" className="mt-2" asChild>
                      <a href="/admin/users">Go to User Management</a>
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h4 className="font-medium">System Settings</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure global application settings
                    </p>
                    <Button variant="outline" className="mt-2" asChild>
                      <a href="/admin/settings">System Configuration</a>
                    </Button>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h4 className="font-medium">Component Library</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage circuit components available in the editor
                    </p>
                    <Button variant="outline" className="mt-2" asChild>
                      <a href="/admin/components">Manage Components</a>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t px-6 py-4">
        <p className="text-xs text-muted-foreground">
          Last updated: {profile.updated_at ? new Date(profile.updated_at).toLocaleString() : "Never"}
        </p>
      </CardFooter>
    </Card>
  );
};

export default ProfileSection;
