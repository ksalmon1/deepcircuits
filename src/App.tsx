
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import WokwiDemo from "./components/CircuitComponents/WokwiDemo";
import CircuitEditorPage from "./components/CircuitEditor/CircuitEditorPage";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/features" element={<Features />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/about" element={<About />} />
    
    {/* Public routes - only accessible when not logged in */}
    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
    <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
    <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
    <Route path="/reset-password" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
    
    {/* Protected routes - only accessible when logged in */}
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/circuit-demo" element={<ProtectedRoute><WokwiDemo /></ProtectedRoute>} />
    <Route path="/circuit-editor" element={<ProtectedRoute><CircuitEditorPage /></ProtectedRoute>} />
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
