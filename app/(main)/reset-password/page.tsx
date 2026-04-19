'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useMemo, useState } from 'react';
import { EyeIcon, EyeOffIcon } from '../components/icons';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!token) {
      setError('Invalid reset link. Please start the forgot-password flow again.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? 'Password reset failed');
      }

      setMessage(data.message ?? 'Password reset successful');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="site-container max-w-xl py-10">
      <div className="rounded-3xl border border-orange-200/70 bg-white/95 p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Reset password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter a new password to finish resetting and sign in automatically.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2.5 pr-11 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-orange-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon className="h-4.5 w-4.5" /> : <EyeIcon className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Confirm new password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter new password"
              className="w-full rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-600">{error}</p>
          )}
          {message && (
            <p className="rounded-xl border border-green-200 bg-green-50 p-2.5 text-sm text-green-700">{message}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Reset password'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/" className="text-sm font-semibold text-orange-700 hover:text-orange-800">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="site-container max-w-xl py-10">
          <div className="rounded-3xl border border-orange-200/70 bg-white/95 p-6 shadow-sm">
            <h1 className="text-2xl font-black text-slate-900">Reset password</h1>
            <p className="mt-2 text-sm text-slate-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
