
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, CircuitBoard, Code, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Sample activity data - in a real app, this would come from a database
const activityData = [
  { day: 'Mon', compilations: 4, edits: 8 },
  { day: 'Tue', compilations: 3, edits: 5 },
  { day: 'Wed', compilations: 5, edits: 10 },
  { day: 'Thu', compilations: 7, edits: 12 },
  { day: 'Fri', compilations: 2, edits: 7 },
  { day: 'Sat', compilations: 6, edits: 9 },
  { day: 'Sun', compilations: 3, edits: 6 },
];

interface AnalyticsProps {
  totalProjects: number;
  activeProjects: number;
  recentlyModified: number;
  codeCompilations: number;
}

const DashboardAnalytics = ({ 
  totalProjects, 
  activeProjects, 
  recentlyModified,
  codeCompilations
}: AnalyticsProps) => {
  return (
    <div className="mb-8">
      <h2 className="mb-4 text-xl font-semibold">Analytics</h2>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <CircuitBoard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  {totalProjects > 0 ? `+${Math.floor(totalProjects * 0.1)} from last month` : 'No projects yet'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeProjects}</div>
                <p className="text-xs text-muted-foreground">
                  {activeProjects > 0 ? `${Math.round((activeProjects / totalProjects) * 100)}% of total projects` : 'No active projects'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recently Modified</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentlyModified}</div>
                <p className="text-xs text-muted-foreground">Updated in the last 7 days</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Code Compilations</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{codeCompilations}</div>
                <p className="text-xs text-muted-foreground">In the last 30 days</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your project activity over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={activityData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="edits"
                      stroke="#4C72F4"
                      strokeWidth={2}
                      dot={{
                        strokeWidth: 2,
                        r: 4,
                        strokeDasharray: '',
                      }}
                      activeDot={{ r: 6, stroke: '#4C72F4', strokeWidth: 2 }}
                      name="Project Edits"
                    />
                    <Line
                      type="monotone"
                      dataKey="compilations"
                      stroke="#F4C95D"
                      strokeWidth={2}
                      dot={{
                        strokeWidth: 2,
                        r: 4, 
                        strokeDasharray: '',
                      }}
                      activeDot={{ r: 6, stroke: '#F4C95D', strokeWidth: 2 }}
                      name="Code Compilations"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardAnalytics;
