
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CircuitBoard } from "lucide-react";

const Login = () => {
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
            
            {/* Login form will be added in a future step */}
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-100 p-4 text-center text-sm text-slate-500">
                Sign in form will be implemented in the next phase
              </div>
              
              <Button className="w-full">Sign in</Button>
              
              <div className="text-center text-sm">
                <Link to="/forgot-password" className="text-slate-600 hover:text-primary">
                  Forgot your password?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
