
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const SecurityTab: React.FC = () => {
  return (
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
  );
};

export default SecurityTab;
