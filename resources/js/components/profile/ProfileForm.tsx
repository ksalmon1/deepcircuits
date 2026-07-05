import React, { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import { AuthUser } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ProfileFormProps {
  user: AuthUser | null;
  profile: AuthUser | null;
  updateProfile: (profile: AuthUser) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ user, profile }) => {
  const { data, setData, patch, processing, errors, reset } = useForm({
    display_name: profile?.display_name || "",
    avatar_url: profile?.avatar_url || "",
  });

  useEffect(() => {
    if (profile) {
      setData({
        display_name: profile.display_name || "",
        avatar_url: profile.avatar_url || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name, profile?.avatar_url]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    patch("/profile", {
      preserveScroll: true,
      onSuccess: () => toast.success("Profile updated successfully!"),
      onError: () => toast.error("Failed to update profile."),
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
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

      <div className="space-y-2">
        <label htmlFor="display_name" className="block text-sm font-medium">
          Display Name
        </label>
        <Input
          id="display_name"
          placeholder="Your display name"
          value={data.display_name}
          onChange={(e) => setData("display_name", e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          This is the name that will be displayed to other users.
        </p>
        {errors.display_name && <p className="text-sm text-red-500">{errors.display_name}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="avatar_url" className="block text-sm font-medium">
          Avatar URL
        </label>
        <Input
          id="avatar_url"
          placeholder="https://example.com/avatar.png"
          value={data.avatar_url}
          onChange={(e) => setData("avatar_url", e.target.value)}
        />
        <p className="text-sm text-muted-foreground">Enter the URL of your avatar image.</p>
        {errors.avatar_url && <p className="text-sm text-red-500">{errors.avatar_url}</p>}
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={processing}>
          {processing ? "Saving..." : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => reset()} disabled={processing}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default ProfileForm;
