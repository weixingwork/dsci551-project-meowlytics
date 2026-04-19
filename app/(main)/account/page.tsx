'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { UserIcon } from '../components/icons';

export default function AccountPage() {
  const user = useFavoritesStore((state) => state.user);
  const favorites = useFavoritesStore((state) => state.favorites);
  const initialized = useFavoritesStore((state) => state.initialized);
  const initialize = useFavoritesStore((state) => state.initialize);

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  if (!initialized) {
    return <div className="site-container py-20 text-slate-500">Loading account...</div>;
  }

  if (!user) {
    return (
      <div className="site-container py-10">
        <div className="glass-card rounded-3xl p-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            <UserIcon className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Please sign in</h2>
          <p className="text-slate-500 mb-6">Sign in to view your account info and favorite stats.</p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-3 font-semibold text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="site-container space-y-6 py-8">
      <section className="glass-card rounded-3xl p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-10 -right-12 w-40 h-40 rounded-full bg-orange-100/70 blur-2xl" />
        <h1 className="text-3xl font-black bg-gradient-to-r from-orange-700 to-teal-500 bg-clip-text text-transparent">
          Account
        </h1>
        <p className="text-slate-500 mt-2">Manage your sign-in status, permissions, and saved favorites.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="glass-card rounded-2xl p-5">
          <p className="text-xs tracking-wide uppercase text-slate-400">Email</p>
          <p className="mt-2 text-slate-800 font-semibold break-all">{user.email}</p>
        </article>
        <article className="glass-card rounded-2xl p-5">
          <p className="text-xs tracking-wide uppercase text-slate-400">Display name</p>
          <p className="mt-2 text-slate-800 font-semibold">{user.displayName || 'Not set'}</p>
        </article>
        <article className="glass-card rounded-2xl p-5">
          <p className="text-xs tracking-wide uppercase text-slate-400">Role</p>
          <p className="mt-2 text-slate-800 font-semibold">{user.isAdmin ? 'Admin' : 'User'}</p>
        </article>
      </section>

      <section className="glass-card rounded-3xl p-6">
        <h2 className="text-lg font-black text-slate-800">Usage overview</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <p className="text-sm text-slate-600">Favorites</p>
            <p className="text-3xl font-black text-orange-700 mt-1">{favorites.length}</p>
          </div>
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <p className="text-sm text-slate-600">Registered</p>
            <p className="text-sm font-semibold text-teal-700 mt-2">
              {new Date(user.createdAt).toLocaleString('en-US')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
