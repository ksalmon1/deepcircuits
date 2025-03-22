
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CircuitBoard } from "lucide-react";

const Signup = () => {
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
              <h1 className="text-2xl font-bold text-slate-900">Create an account</h1>
              <p className="mt-2 text-sm text-slate-600">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
            
            {/* Signup form will be added in a future step */}
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-100 p-4 text-center text-sm text-slate-500">
                Sign up form will be implemented in the next phase
              </div>
              
              <Button className="w-full">Create account</Button>
              
              <p className="mt-4 text-center text-xs text-slate-500">
                By creating an account, you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
