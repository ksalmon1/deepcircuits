import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom"

// Import App and necessary page/guard components
import App from './App.tsx'
import Index from "@/pages/Index"
import Login from "@/pages/Login"
import Signup from "@/pages/Signup"
import Dashboard from "@/pages/Dashboard"
import ProfileSettings from "@/pages/ProfileSettings"
import AdminSettings from "@/pages/AdminSettings"
import UserManagement from "@/pages/admin/UserManagement"
import SystemSettings from "@/pages/admin/SystemSettings"
import ComponentAdmin from "@/pages/admin/ComponentAdmin"
import DatabaseBackup from "@/pages/admin/DatabaseBackup"
import About from "@/pages/About"
import Features from "@/pages/Features"
import Pricing from "@/pages/Pricing"
import NotFound from "@/pages/NotFound"
import ForgotPassword from "@/pages/ForgotPassword"
import ResetPassword from "@/pages/ResetPassword"
import CircuitEditorLayout from "@/components/CircuitEditor/CircuitEditorLayout"
import { ProtectedRoute, PublicOnlyRoute } from "@/guards/ProtectedRoute"
import { AdminRoute } from "@/guards/AdminRoute"

import './index.css'
import './styles/tailwind.css'
import './styles/component-preview.css'
// import './styles/circuit-canvas.css' // Removed as the file was deleted

// Create the router instance with nested routes
const router = createBrowserRouter([
  {
    // Root layout component (App provides contexts)
    element: <App />,
    // Define child routes relative to the root
    children: [
      // Public Routes
      { path: "/", element: <Index /> },
      { path: "/login", element: <PublicOnlyRoute><Login /></PublicOnlyRoute> },
      { path: "/signup", element: <PublicOnlyRoute><Signup /></PublicOnlyRoute> },
      { path: "/about", element: <About /> },
      { path: "/features", element: <Features /> },
      { path: "/pricing", element: <Pricing /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      
      // Placeholder routes
      { path: "/documentation", element: <NotFound /> },
      { path: "/tutorials", element: <NotFound /> },
      { path: "/blog", element: <NotFound /> },
      { path: "/team", element: <NotFound /> },
      { path: "/contact", element: <NotFound /> },

      // Protected Routes
      {
        path: "/dashboard",
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
      },
      {
        path: "/profile",
        element: <ProtectedRoute><ProfileSettings /></ProtectedRoute>,
      },
      {
        path: "/circuit-editor/:id",
        element: <ProtectedRoute><CircuitEditorLayout /></ProtectedRoute>,
      },
      
      // Admin Routes (nested under /admin? or flat?)
      // Keeping them flat for now as per original structure
      { path: "/admin", element: <AdminRoute><AdminSettings /></AdminRoute> },
      { path: "/admin/users", element: <AdminRoute><UserManagement /></AdminRoute> },
      { path: "/admin/system", element: <AdminRoute><SystemSettings /></AdminRoute> },
      { path: "/admin/components", element: <AdminRoute><ComponentAdmin /></AdminRoute> },
      { path: "/admin/database", element: <AdminRoute><DatabaseBackup /></AdminRoute> },

      // 404 Route - must be last
      { path: "*", element: <NotFound /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
