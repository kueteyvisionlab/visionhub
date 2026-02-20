'use client';

import Sidebar from '@/components/Sidebar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-surface-200">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 ml-64">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Search */}
          <div className="relative w-96">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm text-surface-900 placeholder:text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button className="relative p-2 rounded-lg hover:bg-surface-50 transition-colors">
              <svg
                className="w-5 h-5 text-surface-800"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
              {/* Notification badge */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-rose rounded-full"></span>
            </button>

            {/* User dropdown */}
            <div className="flex items-center gap-3 pl-4 border-l border-surface-200">
              <div className="text-right">
                <p className="text-sm font-medium text-surface-900">{userName}</p>
                <p className="text-xs text-surface-200">{user?.email || ''}</p>
              </div>
              <button
                onClick={signOut}
                title="Déconnexion"
                className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                {userInitials}
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-6 bg-surface-50 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}
