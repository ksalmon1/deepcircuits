
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/use-profile";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Lock, 
  Trash2, 
  Shield
} from "lucide-react";

// Import the component files from their new locations
import ProfileForm from "@/components/profile/ProfileForm";
import SubscriptionTab from "@/components/profile/SubscriptionTab";
import SecurityTab from "@/components/profile/SecurityTab";
import DangerZoneTab from "@/components/profile/DangerZoneTab";
import AdminLinks from "@/components/profile/AdminLinks";

const ProfileSection = () => {
  const { user, signOut } = useAuth();
  const { profile, isAdmin, setProfileData } = useProfile();
  
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
              <ProfileForm 
                user={user} 
                profile={profile} 
                updateProfile={setProfileData} 
              />
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

              {isAdmin() && <AdminLinks />}
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

        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="danger">
          <DangerZoneTab signOut={signOut} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileSection;
