import React from 'react';
import { Route, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import ProfileSettings from "@/pages/ProfileSettings";
import AdminSettings from "@/pages/AdminSettings";
import UserManagement from "@/pages/admin/UserManagement";
import SystemSettings from "@/pages/admin/SystemSettings";
import ComponentAdmin from "@/pages/admin/ComponentAdmin";
import DatabaseBackup from "@/pages/admin/DatabaseBackup";
import About from "@/pages/About";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";
import NotFound from "@/pages/NotFound";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import CircuitEditorLayout from "@/components/CircuitEditor/CircuitEditorLayout";
import { ProtectedRoute, PublicOnlyRoute } from "@/guards/ProtectedRoute";
import { AdminRoute } from "@/guards/AdminRoute";
import { AuthProvider } from "@/context/AuthContext";
import { ComponentLibraryProvider } from "@/context/ComponentLibraryContext";

import "./App.css";

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
