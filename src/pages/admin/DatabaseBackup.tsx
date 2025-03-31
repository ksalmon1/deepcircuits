
import React from "react";
import PageLayout from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  Download, 
  Upload, 
  Clock, 
  RefreshCw 
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

const DatabaseBackup = () => {
  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Database Management</h1>
            <p className="text-gray-500 mt-2">Backup, restore, and manage your database</p>
          </div>
          <Button className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-green-500" />
                Create Backup
              </CardTitle>
              <CardDescription>
                Generate a new database backup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                This will create a complete backup of your database that can be downloaded or stored in the cloud.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Generate Backup</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-amber-500" />
                Restore Database
              </CardTitle>
              <CardDescription>
                Restore from previous backup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Choose a backup file to restore. This will replace your current database with the backup version.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Select Backup File</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Scheduled Backups
              </CardTitle>
              <CardDescription>
                Configure automatic backup schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Set up regular automated backups to protect your data.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Configure Schedule</Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Backup History</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-4 font-medium">Backup Date</th>
                      <th className="text-left p-4 font-medium">Size</th>
                      <th className="text-left p-4 font-medium">Created By</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-4">2023-09-15 14:30:22</td>
                      <td className="p-4">24.5 MB</td>
                      <td className="p-4">System</td>
                      <td className="p-4">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          Complete
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Database className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-4">2023-09-01 08:15:10</td>
                      <td className="p-4">23.8 MB</td>
                      <td className="p-4">admin@example.com</td>
                      <td className="p-4">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          Complete
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Database className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default DatabaseBackup;
