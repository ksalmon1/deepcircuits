
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CircuitBoard } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter both email and password",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message || "Please check your credentials and try again",
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="container flex flex-1 flex-col items-center justify-center py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Link to="/" className="flex items-center gap-2">
              <CircuitBoard className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-slate-900">CircuitSim</span>
            </Link>
          </div>
          
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Sign in to your account</h1>
              <p className="mt-2 text-sm text-slate-600">
                Don't have an account?{" "}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
