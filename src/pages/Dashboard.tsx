
import PageLayout from "@/components/PageLayout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <PageLayout>
      <div className="container py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
            <LogOut size={16} />
            Sign Out
          </Button>
        </div>

        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Welcome, {user?.email}</h2>
          <p className="text-slate-600">
            This is your dashboard where you'll manage your circuit projects.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Your Projects</h2>
          <div className="rounded-md border border-slate-200 bg-slate-100 p-8 text-center text-slate-500">
            Your projects will appear here
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
