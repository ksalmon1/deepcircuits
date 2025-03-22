
import React, { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Mail, Calendar, Shield, Image } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Define form schema for profile updates
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

const ProfileSection = () => {
  const { profile, roles, isLoading, updateProfile } = useProfile();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  
  // Form handling
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

  // Reset form when profile changes
  React.useEffect(() => {
    if (profile) {
      form.reset({
        display_name: profile.display_name || "",
        avatar_url: profile.avatar_url || "",
        bio: "",
      });
    }
  }, [profile, form]);

  // Handle form submission
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
            {roles.includes('admin') && (
              <TabsTrigger value="admin">Admin Settings</TabsTrigger>
            )}
          </TabsList>
          
          {/* Profile Tab */}
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
          
          {/* Account Tab */}
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
          
          {/* Admin Settings Tab */}
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
                    <Button variant="outline" className="mt-2">Go to User Management</Button>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h4 className="font-medium">System Settings</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure global application settings
                    </p>
                    <Button variant="outline" className="mt-2">System Configuration</Button>
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
