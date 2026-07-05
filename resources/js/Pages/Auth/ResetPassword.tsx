import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Link } from '@/lib/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CircuitBoard } from 'lucide-react';

interface ResetPasswordProps {
  token: string;
  email: string;
}

const ResetPassword = ({ token, email }: ResetPasswordProps) => {
  const { data, setData, post, processing, errors } = useForm({
    token,
    email,
    password: '',
    password_confirmation: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/reset-password');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Head title="Reset password" />
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
              <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <Input id="email" type="email" value={data.email} readOnly />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  New password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="password_confirmation" className="block text-sm font-medium text-slate-700">
                  Confirm new password
                </label>
                <Input
                  id="password_confirmation"
                  type="password"
                  value={data.password_confirmation}
                  onChange={(e) => setData('password_confirmation', e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {errors.password_confirmation && (
                  <p className="text-sm text-red-500">{errors.password_confirmation}</p>
                )}
              </div>

              <Button className="w-full" type="submit" disabled={processing}>
                {processing ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
