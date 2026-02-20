'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import GlobalSearch from '@/components/GlobalSearch';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';

// ---------------------------------------------------------------------------
// Notification Panel
// ---------------------------------------------------------------------------
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  created_at: string;
  read: boolean;
}

function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !session?.access_token) return;
    setLoading(true);
    apiGet<{ data: Notification[] }>('/notifications?limit=10', session.access_token)
      .then(({ data }) => {
        if (data?.data) setNotifications(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, session]);

  if (!open) return null;

  const demoNotifications: Notification[] = notifications.length > 0 ? notifications : [
    { id: '1', title: 'Nouveau deal', message: 'Deal "Maintenance annuelle" créé', type: 'success', created_at: new Date().toISOString(), read: false },
    { id: '2', title: 'Devis accepté', message: 'Le devis DEV-2024-042 a été accepté', type: 'success', created_at: new Date(Date.now() - 3600000).toISOString(), read: false },
    { id: '3', title: 'Rappel', message: 'Appeler M. Dupont demain à 10h', type: 'warning', created_at: new Date(Date.now() - 7200000).toISOString(), read: true },
  ];

  const typeColors = {
    info: 'bg-brand-100 text-brand-600',
    success: 'bg-accent-emerald/10 text-accent-emerald',
    warning: 'bg-accent-amber/10 text-accent-amber',
  };

  return (
    <div ref={panelRef} className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-surface-200 overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-900">Notifications</h3>
        <span className="text-xs text-surface-400">{demoNotifications.filter(n => !n.read).length} non lues</span>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          demoNotifications.map((n) => (
            <div key={n.id} className={`px-4 py-3 border-b border-surface-100 hover:bg-surface-50 transition-colors ${!n.read ? 'bg-brand-50/30' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-brand-500' : 'bg-surface-200'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900">{n.title}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-surface-400 mt-1">
                    {new Date(n.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-surface-200 bg-surface-50">
        <button className="text-xs text-brand-500 hover:text-brand-600 font-medium">
          Tout marquer comme lu
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Dropdown Menu
// ---------------------------------------------------------------------------
function UserDropdown({ userName, userEmail, userInitials }: { userName: string; userEmail: string; userInitials: string }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 pl-4 border-l border-surface-200"
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-surface-900">{userName}</p>
          <p className="text-xs text-surface-400">{userEmail}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          {userInitials}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-surface-200 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-surface-200">
            <p className="text-sm font-medium text-surface-900">{userName}</p>
            <p className="text-xs text-surface-400">{userEmail}</p>
          </div>
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
            >
              <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              Mon profil
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
            >
              <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Paramètres
            </Link>
          </div>
          <div className="border-t border-surface-200 py-1">
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-accent-rose hover:bg-accent-rose/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Content
// ---------------------------------------------------------------------------
function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
  const userEmail = user?.email || '';
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
          <p className="text-sm text-surface-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-surface-900/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, toggleable */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          {/* Left: hamburger + search */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-50 transition-colors"
            >
              <svg className="w-5 h-5 text-surface-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Search trigger */}
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
              }}
              className="relative hidden sm:flex w-72 lg:w-96 items-center gap-3 pl-10 pr-4 py-2 rounded-lg border border-surface-200 bg-surface-50 text-sm text-surface-400 hover:border-surface-300 transition-colors text-left"
            >
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              Rechercher...
              <kbd className="ml-auto text-[10px] font-medium text-surface-300 bg-white px-1.5 py-0.5 rounded border border-surface-200">
                Ctrl+K
              </kbd>
            </button>

            {/* Mobile search icon */}
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
              }}
              className="sm:hidden p-2 rounded-lg hover:bg-surface-50 transition-colors"
            >
              <svg className="w-5 h-5 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </div>

          <GlobalSearch />

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg hover:bg-surface-50 transition-colors"
              >
                <svg className="w-5 h-5 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-rose rounded-full" />
              </button>
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            {/* User dropdown */}
            <UserDropdown userName={userName} userEmail={userEmail} userInitials={userInitials} />
          </div>
        </header>

        {/* Main content */}
        <main className="p-4 sm:p-6 bg-surface-50 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout wrapper
// ---------------------------------------------------------------------------
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardContent>{children}</DashboardContent>
      </ToastProvider>
    </AuthProvider>
  );
}
