
import { Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import ProfileSettings from "@/pages/ProfileSettings";
import AdminSettings from "@/pages/AdminSettings";
import UserManagement from "@/pages/admin/UserManagement";
import SystemSettings from "@/pages/admin/SystemSettings";
import ComponentAdmin from "@/pages/admin/ComponentAdmin";
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

import "./App.css";

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* These routes will show 404 until implemented */}
          <Route path="/documentation" element={<NotFound />} />
          <Route path="/tutorials" element={<NotFound />} />
          <Route path="/blog" element={<NotFound />} />
          <Route path="/team" element={<NotFound />} />
          <Route path="/contact" element={<NotFound />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminSettings /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="/admin/system" element={<AdminRoute><SystemSettings /></AdminRoute>} />
          <Route path="/admin/components" element={<AdminRoute><ComponentAdmin /></AdminRoute>} />
          
          <Route
            path="/circuit-editor/:id"
            element={
              <ProtectedRoute>
                <CircuitEditorLayout />
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
