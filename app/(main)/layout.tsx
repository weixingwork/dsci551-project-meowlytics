'use client';

import Link from 'next/link';
import Navbar from './components/Navbar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cat-gradient paw-pattern relative overflow-x-clip">
      <div className="pointer-events-none absolute -top-24 -left-12 h-72 w-72 rounded-full bg-orange-200/35 blur-3xl" />
      <div className="pointer-events-none absolute top-16 -right-20 h-80 w-80 rounded-full bg-teal-200/35 blur-3xl" />

      <Navbar />

      <main className="relative pb-10 pt-6 md:pb-14 md:pt-8">{children}</main>

      <footer className="relative border-t border-orange-200/70 bg-white/85 backdrop-blur-lg">
        <div className="site-container py-10">
          <div className="grid gap-6 md:grid-cols-3">
            <section>
              <h3 className="text-sm font-black text-slate-800">Meowlytics</h3>
              <p className="mt-2 text-sm text-slate-600">Turn cat food ingredient labels into readable, comparable, actionable health insights.</p>
            </section>

            <section>
              <h3 className="text-sm font-black text-slate-800">Navigation</h3>
              <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                <Link href="/" className="hover:text-orange-700">Analyze</Link>
                <Link href="/favorites" className="hover:text-orange-700">Favorites</Link>
                <Link href="/account" className="hover:text-orange-700">Account</Link>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-black text-slate-800">Tips</h3>
              <p className="mt-2 text-sm text-slate-600">Before switching foods, upload the ingredient label and consider your cat&apos;s condition.</p>
            </section>
          </div>

          <p className="mt-8 border-t border-orange-100 pt-4 text-xs text-slate-500">
            © {new Date().getFullYear()} Meowlytics. For pet nutrition reference only.
          </p>
        </div>
      </footer>
    </div>
  );
}
