import React from 'react';
import { Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

import { AuthProvider } from "@/context/AuthContext";
import { ComponentLibraryProvider } from "@/context/ComponentLibraryContext";

import "./App.css";
import '@/styles/simulation.css';
import '@/styles/components.css';

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ComponentLibraryProvider>
          <Outlet />
          <SonnerToaster position="top-center" duration={3000} />
        </ComponentLibraryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
