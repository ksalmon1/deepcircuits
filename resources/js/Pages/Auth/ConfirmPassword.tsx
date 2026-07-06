import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ConfirmPassword = () => {
  const { data, setData, post, processing, errors } = useForm({ password: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/confirm-password');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Head title="Confirm password" />
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Confirm your password</h1>
        <p className="mb-4 text-sm text-slate-600">
          This is a secure area of the application. Please confirm your password before continuing.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={data.password}
              onChange={(e) => setData('password', e.target.value)}
              autoComplete="current-password"
              required
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
          </div>
          <Button className="w-full" type="submit" disabled={processing}>
            {processing ? 'Confirming...' : 'Confirm'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ConfirmPassword;
