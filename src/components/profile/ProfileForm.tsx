
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Profile } from "@/types/database";
import { User } from "@supabase/supabase-js";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

interface ProfileFormProps {
  user: User | null;
  profile: Profile | null;
  updateProfile: (updates: Partial<Profile>) => Promise<{
    success: boolean;
    error?: any;
  }>;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ user, profile, updateProfile }) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: "",
      avatar_url: "",
    },
  });

  useEffect(() => {
    if (profile) {
      console.log("Setting form values from profile:", profile);
      form.reset({
        display_name: profile.display_name || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile, user, form]);

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true);
    console.log("Form submitted with data:", data);

    // Clear any previous form errors
    if (form.formState.errors) {
      form.clearErrors();
    }

    // Make sure we have a valid user before attempting the update
    if (!user) {
      console.error("Cannot update profile: No user logged in");
      setIsLoading(false);
      return;
    }

    const result = await updateProfile({
      display_name: data.display_name,
      avatar_url: data.avatar_url,
    });

    setIsLoading(false);
    
    if (result.success) {
      console.log("Profile update completed successfully");
      // We don't need to show success toast here as it's already shown in updateProfile
    } else {
      console.error("Error updating profile:", result.error);
      // Error toast is already shown in updateProfile
    }
  }

  return (
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
  );
};

export default ProfileForm;
