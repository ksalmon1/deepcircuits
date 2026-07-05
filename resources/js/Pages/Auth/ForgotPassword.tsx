import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Link } from '@/lib/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CircuitBoard } from 'lucide-react';

const ForgotPassword = ({ status }: { status?: string }) => {
  const { data, setData, post, processing, errors } = useForm({ email: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/forgot-password');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Head title="Forgot password" />
      <div className="container flex flex-1 flex-col items-center justify-center py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Link to="/" className="flex items-center gap-2">
              <CircuitBoard className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-slate-900">DeepCircuits</span>
            </Link>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
              <p className="mt-2 text-sm text-slate-600">
                Enter your email and we'll send you a password reset link.
              </p>
            </div>

            {status && <p className="mb-4 text-sm font-medium text-green-600">{status}</p>}

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  placeholder="you@example.com"
                  required
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <Button className="w-full" type="submit" disabled={processing}>
                {processing ? 'Sending...' : 'Send reset link'}
              </Button>

              <p className="text-center text-sm text-slate-600">
                <Link to="/login" className="text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
