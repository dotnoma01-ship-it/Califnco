import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Wrench,
  Menu,
  X,
  LogOut,
  LogIn,
  Database,
  AlertTriangle,
} from 'lucide-react';
import type { AdminPageId } from '../types';

interface AdminLayoutProps {
  activePage: AdminPageId;
  onNavigate: (page: AdminPageId) => void;
  user: User | null;
  isDemoMode: boolean;
  pendingOrdersCount: number;
  pendingDealersCount: number;
  openServiceCount: number;
  canSeedFirestore: boolean;
  isSeeding: boolean;
  onSeedFirestore: () => void;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onOpenMobileStudio?: () => void;
  children: React.ReactNode;
}

const PAGE_TITLES: Record<AdminPageId, string> = {
  dashboard: 'Admin Dashboard',
  orders: 'Order Management',
  dealers: 'Dealer Approval',
  service: 'Service Desk',
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activePage,
  onNavigate,
  user,
  isDemoMode,
  pendingOrdersCount,
  pendingDealersCount,
  openServiceCount,
  canSeedFirestore,
  isSeeding,
  onSeedFirestore,
  onGoogleSignIn,
  onSignOut,
  onOpenMobileStudio,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const pageTitle = PAGE_TITLES[activePage];

  const handleNavSelect = (page: AdminPageId) => {
    onNavigate(page);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation (256px Desktop, Slide-Over Mobile) */}
      <aside
        aria-label="Administrator Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col justify-between transition-transform duration-150 ease-out lg:static lg:translate-x-0 shrink-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Sidebar Brand Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
            <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
              Califnco Admin
            </span>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Navigation — Strictly Pages 19, 20, 21 & 22 */}
          <nav className="p-4 space-y-1" aria-label="Primary Pages">
            <button
              type="button"
              onClick={() => handleNavSelect('dashboard')}
              aria-current={activePage === 'dashboard' ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activePage === 'dashboard'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Admin Dashboard</span>
              </span>
              <span className="font-mono text-xs opacity-75 tabular-nums">P19</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavSelect('orders')}
              aria-current={activePage === 'orders' ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activePage === 'orders'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>Order Management</span>
              </span>
              <span className="font-mono text-xs tabular-nums">
                {pendingOrdersCount > 0 ? `${pendingOrdersCount} pending` : 'P20'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNavSelect('dealers')}
              aria-current={activePage === 'dealers' ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activePage === 'dealers'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Building2 className="w-4 h-4 shrink-0" />
                <span>Dealer Approval</span>
              </span>
              <span className="font-mono text-xs tabular-nums">
                {pendingDealersCount > 0 ? `${pendingDealersCount} review` : 'P21'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleNavSelect('service')}
              aria-current={activePage === 'service' ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activePage === 'service'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Wrench className="w-4 h-4 shrink-0" />
                <span>Service Desk</span>
              </span>
              <span className="font-mono text-xs tabular-nums">
                {openServiceCount > 0 ? `${openServiceCount} open` : 'P22'}
              </span>
            </button>
          </nav>
        </div>

        {/* Account & Session Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {user && !isDemoMode ? (
            <>
              <div className="px-1">
                <p className="text-xs font-semibold text-white truncate">
                  {user.displayName || 'Verified Administrator'}
                </p>
                <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{user.email}</p>
                <p className="text-[11px] text-teal-400 mt-1">
                  Cloud Firestore · Live Session
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <div className="px-1">
                <p className="text-xs font-semibold text-amber-300">Demo Preview Session</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                  Read-only sample records. Sign in to persist live Firestore updates.
                </p>
              </div>
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in with Google</span>
              </button>
            </>
          )}
          {onOpenMobileStudio && (
            <button
              type="button"
              onClick={onOpenMobileStudio}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Open Mobile App Studio</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Strictly 3 Zones separated by gap-8 */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-8 shrink-0">
          {/* Zone 1: Breadcrumb Trail */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm whitespace-nowrap truncate">
              <span className="text-slate-500 hidden sm:inline">Califnco Operations</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-display font-semibold text-slate-900">{pageTitle}</span>
            </div>
          </div>

          {/* Zone 2: Concise Single-Line Navigation Links (4 Links) */}
          <nav
            aria-label="Quick Page Switcher"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            {(
              [
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'orders', label: 'Orders' },
                { id: 'dealers', label: 'Dealers' },
                { id: 'service', label: 'Service' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activePage === item.id
                    ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-teal-700 font-semibold'
                    : 'hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
            {onOpenMobileStudio && (
              <button
                type="button"
                onClick={onOpenMobileStudio}
                className="py-1 text-teal-700 hover:text-teal-900 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Mobile App
              </button>
            )}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            {isDemoMode ? (
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Admin Sign In
              </button>
            ) : canSeedFirestore ? (
              <button
                type="button"
                disabled={isSeeding}
                onClick={onSeedFirestore}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isSeeding ? 'Seeding Firestore...' : 'Seed Sample Records'}</span>
              </button>
            ) : activePage === 'dashboard' ? (
              <button
                type="button"
                onClick={() => onNavigate('dealers')}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Review Dealers
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Overview Metrics
              </button>
            )}
          </div>
        </header>

        {/* Explicit Demo Data Disclosure Banner */}
        {isDemoMode && (
          <div
            role="status"
            className="bg-amber-50 border-b border-amber-200 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Demo Data Mode:</strong> Displaying sample Califnco records for preview.
                Isolated contact PII is redacted and mutations are disabled until you sign in as an
                authorized administrator.
              </span>
            </div>
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="font-semibold text-amber-950 underline hover:no-underline whitespace-nowrap cursor-pointer"
            >
              Connect Live Firestore
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
