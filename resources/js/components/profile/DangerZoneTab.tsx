import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DangerZoneTabProps {
  signOut: () => void;
}

const DangerZoneTab: React.FC<DangerZoneTabProps> = ({ signOut }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteAccount = () => {
    console.log("Account deletion initiated...");
    setIsDeleteDialogOpen(false);
    toast.success("Account deletion process started (simulated).");
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
              onClick={() => setIsDeleteDialogOpen(true)}
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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default DangerZoneTab;
