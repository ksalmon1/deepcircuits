import React from 'react';
import { Head } from '@inertiajs/react';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';

/**
 * The old Supabase-specific backup screen no longer applies; database
 * backups are an operational concern of the Laravel deployment now.
 */
const DatabaseBackup = () => (
  <PageLayout>
    <Head title="Database" />
    <div className="container py-8">
      <h1 className="mb-6 text-3xl font-bold">Database</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" /> Backups
          </CardTitle>
          <CardDescription>
            This application now runs on Laravel. Schedule database backups on the
            server (for example with <code>spatie/laravel-backup</code> or your
            platform's snapshot tooling) rather than from this dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The active connection is configured in <code>config/database.php</code> via the
            <code> DB_*</code> environment variables.
          </p>
        </CardContent>
      </Card>
    </div>
  </PageLayout>
);

export default DatabaseBackup;
