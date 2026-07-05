import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Link } from '@/lib/router';
import { Button } from '@/components/ui/button';

const VerifyEmail = ({ status }: { status?: string }) => {
  const { post, processing } = useForm({});

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Head title="Verify email" />
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Verify your email</h1>
        <p className="mb-4 text-sm text-slate-600">
          Please confirm your email address by clicking the link we just sent you. If you didn't
          receive the email, we can send another.
        </p>
        {status === 'verification-link-sent' && (
          <p className="mb-4 text-sm font-medium text-green-600">
            A new verification link has been sent to your email address.
          </p>
        )}
        <div className="flex items-center justify-between">
          <Button onClick={() => post('/email/verification-notification')} disabled={processing}>
            Resend verification email
          </Button>
          <Link to="/logout" className="text-sm text-slate-600 underline">
            Log out
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
