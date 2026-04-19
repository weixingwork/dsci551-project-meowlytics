'use client';

import { useEffect, useState } from 'react';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { CloseIcon, EyeIcon, EyeOffIcon, UserIcon } from './icons';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
}

export default function AuthModal({ isOpen, mode, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>(mode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<'auth' | 'forgot'>('auth');
  const [notice, setNotice] = useState<string | null>(null);

  const login = useFavoritesStore((state) => state.login);
  const register = useFavoritesStore((state) => state.register);
  const error = useFavoritesStore((state) => state.error);

  useEffect(() => {
    setTab(mode);
    setView('auth');
    setNotice(null);
  }, [mode]);

  if (!isOpen) {
    return null;
  }

  const submit = async () => {
    if (!email.trim() || !password) {
      alert('Please enter email and password');
      return;
    }

    setSubmitting(true);
    try {
      if (tab === 'login') {
        await login(email.trim(), password);
      } else {
        await register({
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
        });
      }

      setDisplayName('');
      setEmail('');
      setPassword('');
      onClose();
    } catch {
      // error comes from store
    } finally {
      setSubmitting(false);
    }
  };

  const submitForgotPassword = async () => {
    if (!email.trim()) {
      alert('Please enter your email');
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to send reset email');
      }

      setNotice('Reset link sent — please check your inbox.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-orange-200 bg-white/95 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Sign in or sign up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-20 -right-20 w-40 h-40 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-44 h-44 rounded-full bg-teal-200/35 blur-3xl" />

        <div className="relative mb-5 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-xl font-black text-slate-800">
            <UserIcon className="h-5 w-5 text-orange-600" />
            Account
          </h2>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {view === 'auth' ? (
          <>
            <div className="relative mb-5 flex gap-2 rounded-xl border border-orange-100 bg-orange-50 p-1">
              <button
                onClick={() => setTab('login')}
                className={`min-h-11 flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  tab === 'login'
                    ? 'bg-white text-orange-700 shadow-sm'
                    : 'text-slate-500 hover:text-orange-600'
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => setTab('register')}
                className={`min-h-11 flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                  tab === 'register'
                    ? 'bg-white text-orange-700 shadow-sm'
                    : 'text-slate-500 hover:text-orange-600'
                }`}
              >
                Sign up
              </button>
            </div>

            <div className="relative space-y-3">
              {tab === 'register' && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-600">Display name (optional)</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Cat Parent"
                    className="w-full rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-600">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-600">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              {tab === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      setNotice(null);
                    }}
                    className="text-sm text-slate-500 hover:text-orange-600"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-600">{error}</p>
              )}

              <button
                onClick={() => void submit()}
                disabled={submitting}
                className="min-h-11 w-full rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Processing...' : tab === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-800">Reset password</h3>
            <p className="text-sm text-slate-600">
              Enter your registered email and we&apos;ll send you a reset link.
            </p>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-orange-200 bg-orange-50/40 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {notice && (
              <p className="rounded-xl border border-orange-200 bg-orange-50 p-2.5 text-sm text-slate-700">{notice}</p>
            )}

            <button
              type="button"
              onClick={() => void submitForgotPassword()}
              disabled={submitting}
              className="min-h-11 w-full rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send reset link'}
            </button>

            <button
              type="button"
              onClick={() => setView('auth')}
              className="min-h-11 w-full rounded-xl border border-orange-200 bg-white py-2.5 font-semibold text-slate-700 hover:bg-orange-50"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
