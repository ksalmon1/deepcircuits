import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { ComponentLibraryProvider } from '@/context/ComponentLibraryContext';

const queryClient = new QueryClient();

/**
 * Global providers applied to every Inertia page (see app.tsx resolve()).
 */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ComponentLibraryProvider>
          {children}
          <SonnerToaster position="top-center" duration={3000} />
        </ComponentLibraryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
