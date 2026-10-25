import React, { Component, useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { AdminAuthGate } from './admin/components/AdminAuthGate';
import { AdminLayout } from './admin/components/AdminLayout';
import { DEMO_DEALERS, DEMO_ORDERS, DEMO_SERVICE_REQUESTS } from './admin/demoData';
import { auth, googleProvider, isFirebaseConfigured } from './admin/firebase';
import { AdminDashboardPage } from './admin/pages/AdminDashboardPage';
import { OrderManagementPage } from './admin/pages/OrderManagementPage';
import {
  seedInitialFirestoreData,
  subscribeAdminWorkspace,
  verifyAdminAccess,
} from './admin/services/adminFirestoreService';
import type {
  AdminPageId,
  DealerSummary,
  FulfilmentStatus,
  OrderSummary,
  ServiceRequest,
} from './admin/types';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AdminErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-red-200 rounded-xl p-8 space-y-4">
            <h1 className="text-lg font-bold text-slate-900">Application Runtime Exception</h1>
            <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 overflow-x-auto">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer"
            >
              Reset View
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activePage, setActivePage] = useState<AdminPageId>('dashboard');
  const [statusFilter, setStatusFilter] = useState<FulfilmentStatus | 'all'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Auth & RBAC State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isFirebaseConfigured);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isFirebaseConfigured);

  // Live Firestore Data State
  const [liveOrders, setLiveOrders] = useState<OrderSummary[]>([]);
  const [liveDealers, setLiveDealers] = useState<DealerSummary[]>([]);
  const [liveServiceRequests, setLiveServiceRequests] = useState<ServiceRequest[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState<number>(0);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Transient Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotice = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  // Listen to Firebase Authentication state and verify backend RBAC access
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      setIsDemoMode(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setIsAuthorizedAdmin(false);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      try {
        const allowed = await verifyAdminAccess(nextUser);
        setIsAuthorizedAdmin(allowed);
        if (allowed) {
          setIsDemoMode(false);
        }
      } catch (err) {
        setIsAuthorizedAdmin(false);
        setAuthError(err instanceof Error ? err.message : String(err));
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Attach Cloud Firestore real-time listeners ONLY when authenticated & authorized
  useEffect(() => {
    if (isDemoMode || !user || !isAuthorizedAdmin) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setDataError(null);
    let initialOrdersLoaded = false;

    const unsubscribe = subscribeAdminWorkspace({
      onOrders: (records) => {
        setLiveOrders(records);
        if (!initialOrdersLoaded) {
          initialOrdersLoaded = true;
          setDataLoading(false);
        }
      },
      onDealers: (records) => {
        setLiveDealers(records);
      },
      onServiceRequests: (records) => {
        setLiveServiceRequests(records);
      },
      onError: (errMsg) => {
        setDataError(errMsg);
        setDataLoading(false);
      },
    });

    return () => unsubscribe();
  }, [user, isAuthorizedAdmin, isDemoMode, retryCounter]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsDemoMode(false);
    setSelectedOrderId(null);
    showNotice('Signed out of Califnco Operations Console.');
  };

  const handleSeedFirestore = async () => {
    if (!user || !isAuthorizedAdmin) return;
    setIsSeeding(true);
    try {
      await seedInitialFirestoreData(user.uid);
      showNotice('Seeded sample Califnco orders, dealers, and service tickets to Cloud Firestore.');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to seed Cloud Firestore.');
    } finally {
      setIsSeeding(false);
    }
  };

  const orders = isDemoMode ? DEMO_ORDERS : liveOrders;
  const dealers = isDemoMode ? DEMO_DEALERS : liveDealers;
  const serviceRequests = isDemoMode ? DEMO_SERVICE_REQUESTS : liveServiceRequests;

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.fulfilmentStatus === 'pending').length,
    [orders]
  );

  // Show Auth Gate unless user is an authorized admin OR explicitly chose Demo Preview
  const showWorkspace = (Boolean(user) && isAuthorizedAdmin) || isDemoMode;

  return (
    <AdminErrorBoundary>
      {!showWorkspace ? (
        <AdminAuthGate
          user={user}
          authLoading={authLoading}
          isAuthorizedAdmin={isAuthorizedAdmin}
          authError={authError}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
          onEnterDemoMode={() => {
            setIsDemoMode(true);
            showNotice('Entered Read-Only Demo Mode.');
          }}
        />
      ) : (
        <AdminLayout
          activePage={activePage}
          onNavigate={(page) => {
            setActivePage(page);
            if (page === 'dashboard') {
              setSelectedOrderId(null);
            }
          }}
          user={user}
          isDemoMode={isDemoMode}
          pendingOrdersCount={pendingOrdersCount}
          canSeedFirestore={!isDemoMode && !dataLoading && !dataError && liveOrders.length === 0}
          isSeeding={isSeeding}
          onSeedFirestore={handleSeedFirestore}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
        >
          {activePage === 'dashboard' ? (
            <AdminDashboardPage
              orders={orders}
              dealers={dealers}
              serviceRequests={serviceRequests}
              loading={!isDemoMode && dataLoading}
              error={isDemoMode ? null : dataError}
              isDemoMode={isDemoMode}
              isSeeding={isSeeding}
              onRetry={() => setRetryCounter((c) => c + 1)}
              onSeedFirestore={handleSeedFirestore}
              onInspectOrder={(orderId) => {
                setActivePage('orders');
                setSelectedOrderId(orderId);
              }}
              onFilterOrdersByStatus={(status) => {
                setStatusFilter(status);
                setActivePage('orders');
              }}
            />
          ) : (
            <OrderManagementPage
              orders={orders}
              loading={!isDemoMode && dataLoading}
              error={isDemoMode ? null : dataError}
              isDemoMode={isDemoMode}
              isSeeding={isSeeding}
              initialStatusFilter={statusFilter}
              selectedOrderId={selectedOrderId}
              onSelectOrder={setSelectedOrderId}
              onStatusFilterChange={setStatusFilter}
              onSeedFirestore={handleSeedFirestore}
              onRetry={() => setRetryCounter((c) => c + 1)}
              onGoogleSignIn={handleGoogleSignIn}
              onNotify={showNotice}
            />
          )}
        </AdminLayout>
      )}

      {/* Accessible Status Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg text-xs font-medium flex items-center justify-between gap-3"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
    </AdminErrorBoundary>
  );
}
