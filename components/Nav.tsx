'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchMe, SessionUser } from '@/lib/marketplace/client';

export default function Nav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchMe()
      .then((d) => setUser(d.user))
      .finally(() => setLoaded(true));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  }

  const dashHref = user?.role === 'provider' ? '/dashboard/provider' : '/dashboard/customer';

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">✦</span>
          <span className="text-lg">Haven<span className="text-teal-600">Clean</span></span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/cleaners" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 sm:block">
            Find a cleaner
          </Link>
          {loaded && !user && (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                Log in
              </Link>
              <Link href="/signup" className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                Sign up
              </Link>
            </>
          )}
          {loaded && user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
                    Signed in as <span className="font-medium text-gray-700">{user.role}</span>
                  </div>
                  <Link href={dashHref} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                  {user.role === 'customer' && (
                    <Link href="/cleaners" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                      Book a cleaning
                    </Link>
                  )}
                  <button onClick={logout} className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
