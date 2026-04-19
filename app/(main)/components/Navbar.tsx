'use client';

import { useEffect, useMemo, type ComponentType, type SVGProps } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFavoritesStore } from '../store/useFavoritesStore';
import AuthModal from './AuthModal';
import { HeartIcon, SearchIcon, ShieldIcon, UserIcon } from './icons';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  count?: number;
}

export default function Navbar() {
  const pathname = usePathname();
  const initialize = useFavoritesStore((state) => state.initialize);
  const user = useFavoritesStore((state) => state.user);
  const logout = useFavoritesStore((state) => state.logout);
  const loading = useFavoritesStore((state) => state.loading);
  const favoritesCount = useFavoritesStore((state) => state.favorites.length);
  const authOpen = useFavoritesStore((state) => state.authModalOpen);
  const authMode = useFavoritesStore((state) => state.authModalMode);
  const openAuthModal = useFavoritesStore((state) => state.openAuthModal);
  const closeAuthModal = useFavoritesStore((state) => state.closeAuthModal);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const navItems = useMemo(() => {
    const items: NavItem[] = [
      { href: '/', label: 'Analyze', icon: SearchIcon },
      { href: '/favorites', label: 'Favorites', icon: HeartIcon, count: favoritesCount },
    ];

    if (user) {
      items.push({ href: '/account', label: 'Account', icon: UserIcon });
    }

    if (user?.isAdmin) {
      items.push({ href: '/admin', label: 'Admin', icon: ShieldIcon });
    }

    return items;
  }, [favoritesCount, user]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-orange-200/70 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="site-container py-2.5">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="group inline-flex min-w-0 items-center gap-2 rounded-xl border border-orange-200/80 bg-white/95 px-2.5 py-1.5 shadow-sm">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200/80 bg-gradient-to-br from-orange-100 to-amber-100 text-orange-700 transition-transform group-hover:-translate-y-0.5">
                <span className="text-sm font-black">M</span>
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate bg-gradient-to-r from-orange-700 via-orange-500 to-teal-500 bg-clip-text text-base font-black text-transparent">Meowlytics</p>
                <p className="hidden truncate text-[10px] tracking-wide text-slate-500 sm:block">Ingredient Intelligence</p>
              </div>
            </Link>

            <nav className="hidden flex-1 items-center justify-center px-2 md:flex" aria-label="Main navigation">
              <div className="inline-flex items-center gap-1 rounded-xl border border-orange-200/80 bg-white/90 p-1 shadow-sm">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                        active
                          ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow'
                          : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${active ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-700'}`}>
                          {item.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <div className="hidden max-w-56 items-center gap-2 rounded-xl border border-orange-200/80 bg-white px-2.5 py-1.5 shadow-sm lg:flex">
                    <UserIcon className="h-4 w-4 text-orange-600" />
                    <span className="truncate text-xs font-semibold text-slate-700">{user.displayName || user.email}</span>
                    {user.isAdmin && <span className="rounded-full bg-teal-500 px-2 py-0.5 text-[10px] tracking-wide text-white">ADMIN</span>}
                  </div>
                  <button
                    onClick={() => void logout()}
                    disabled={loading}
                    className="min-h-9 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="min-h-9 rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-700"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="min-h-9 rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 md:hidden">
            <nav className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Mobile navigation">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all ${
                      active
                        ? 'border-transparent bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
                        : 'border-orange-100 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-700'}`}>
                        {item.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <AuthModal isOpen={authOpen} mode={authMode} onClose={closeAuthModal} />
    </>
  );
}
