
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DangerZoneTabProps {
  signOut: () => Promise<void>;
}

const DangerZoneTab: React.FC<DangerZoneTabProps> = ({ signOut }) => {
  const { toast } = useToast();

  const handleDeleteAccount = () => {
    toast({
      variant: "destructive",
      title: "Delete account",
      description: "This feature is not implemented yet.",
    });
  };

  return (
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
  );
};

export default DangerZoneTab;
