import React from 'react';
import type { User } from 'firebase/auth';
import { Lock, LogIn, LogOut, ShieldAlert, Eye } from 'lucide-react';

interface AdminAuthGateProps {
  user: User | null;
  authLoading: boolean;
  isAuthorizedAdmin: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onEnterDemoMode: () => void;
  onOpenMobileStudio?: () => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  user,
  authLoading,
  isAuthorizedAdmin,
  authError,
  onGoogleSignIn,
  onSignOut,
  onEnterDemoMode,
  onOpenMobileStudio,
}) => {
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
          <div className="pt-4 space-y-3">
            <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-10 w-full bg-slate-50 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Signed in, but NOT an authorized administrator in Firestore security rules
  if (user && !isAuthorizedAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-8">
          <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-700 mb-5">
            <ShieldAlert className="w-5 h-5" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Administrator Access Required
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Your Google account is authenticated, but it does not hold administrator privileges in
            Cloud Firestore security rules. Customer shipping records and order mutations are
            restricted to verified administrators.
          </p>

          <dl className="mt-6 border-t border-b border-slate-200 py-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Signed-in Email</dt>
              <dd className="font-mono text-slate-900 truncate">{user.email || 'Unverified'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Email Verified</dt>
              <dd className="font-mono text-slate-900">{user.emailVerified ? 'true' : 'false'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Firebase UID</dt>
              <dd className="font-mono text-slate-900 truncate">{user.uid}</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            To authorize this UID in production, an existing administrator must add a document at{' '}
            <code className="font-mono text-slate-800">/admins/{user.uid}</code> and update the
            verified administrator allowlist in <code className="font-mono text-slate-800">firestore.rules</code>.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={onSignOut}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
            <button
              type="button"
              onClick={onEnterDemoMode}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Eye className="w-4 h-4" />
              <span>View Demo Dataset</span>
            </button>
          </div>
          {onOpenMobileStudio && (
            <button
              type="button"
              onClick={onOpenMobileStudio}
              className="mt-3 w-full px-4 py-2 text-xs font-semibold text-teal-700 hover:text-teal-900 underline cursor-pointer"
            >
              Return to Califnco Mobile App Studio (Screens 23–24)
            </button>
          )}
        </div>
      </div>
    );
  }

  // Unauthenticated Administrator Sign-In View
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6">
      <div className="max-w-6xl w-full mx-auto pt-2 flex items-center justify-between gap-4">
        <span className="font-display text-base font-bold tracking-tight text-slate-900">
          Califnco Admin
        </span>
        {onOpenMobileStudio && (
          <button
            type="button"
            onClick={onOpenMobileStudio}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline cursor-pointer whitespace-nowrap"
          >
            Open Mobile App Studio
          </button>
        )}
      </div>

      <main className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-8">
        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 mb-5">
          <Lock className="w-5 h-5" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Operations Console Sign In
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Authenticate with an authorized Califnco administrator Google account to manage retail
          orders, wholesale purchase orders, and fulfilment workflows in Cloud Firestore.
        </p>

        {authError && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed"
          >
            {authError}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={onGoogleSignIn}
            className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in with Google</span>
          </button>

          <button
            type="button"
            onClick={onEnterDemoMode}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Read-Only Demo Mode</span>
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
          Role permissions, order lifecycle transitions, and customer PII isolation are enforced
          server-side by Cloud Firestore security rules.
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto pb-2 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>Califnco Water Purifiers · Enterprise Operations</span>
        <span>Pages 19–22 · Admin Operations Console</span>
      </footer>
    </div>
  );
};
