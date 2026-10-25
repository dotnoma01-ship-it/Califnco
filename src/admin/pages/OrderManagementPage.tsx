import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  Lock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Database,
} from 'lucide-react';
import { DEMO_ORDER_ITEMS } from '../demoData';
import {
  fetchOrderInspectionDetails,
  settleOrderPayment,
  transitionOrderFulfilment,
  updateOrderDispatchNotes,
} from '../services/adminFirestoreService';
import {
  ALLOWED_FULFILMENT_TRANSITIONS,
  canSettleOrderPayment,
  FULFILMENT_LIFECYCLE_ORDER,
  FULFILMENT_STATUS_META,
  isTerminalFulfilmentStatus,
  PAYMENT_STATUS_META,
  VALIDATION_CONSTRAINTS,
  formatInr,
  formatOrderDate,
  type FulfilmentStatus,
  type OrderChannel,
  type OrderLineItem,
  type OrderPrivateDetails,
  type OrderSummary,
} from '../types';

interface OrderManagementPageProps {
  orders: OrderSummary[];
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  isSeeding: boolean;
  initialStatusFilter: FulfilmentStatus | 'all';
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string | null) => void;
  onStatusFilterChange: (status: FulfilmentStatus | 'all') => void;
  onSeedFirestore: () => void;
  onRetry: () => void;
  onGoogleSignIn: () => void;
  onNotify: (message: string) => void;
}

const PROGRESS_STEPS: FulfilmentStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'dispatched',
  'delivered',
];

export const OrderManagementPage: React.FC<OrderManagementPageProps> = ({
  orders,
  loading,
  error,
  isDemoMode,
  isSeeding,
  initialStatusFilter,
  selectedOrderId,
  onSelectOrder,
  onStatusFilterChange,
  onSeedFirestore,
  onRetry,
  onGoogleSignIn,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | OrderChannel>('all');

  // Detail Drawer Subcollection State
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  const [privateDetails, setPrivateDetails] = useState<OrderPrivateDetails | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [mutatingAction, setMutatingAction] = useState<string | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  // Close drawer on Escape key
  useEffect(() => {
    if (!selectedOrder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelectOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrder, onSelectOrder]);

  // Fetch isolated subcollections when inspecting an order
  useEffect(() => {
    if (!selectedOrder) {
      setLineItems([]);
      setPrivateDetails(null);
      setDetailError(null);
      return;
    }

    if (isDemoMode) {
      setLineItems(DEMO_ORDER_ITEMS[selectedOrder.id] ?? []);
      setPrivateDetails(null);
      setNotesDraft('');
      setDetailError(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    fetchOrderInspectionDetails(selectedOrder.id)
      .then((res) => {
        if (cancelled) return;
        setLineItems(res.items);
        setPrivateDetails(res.privateDetails);
        setNotesDraft(res.privateDetails?.dispatchNotes ?? '');
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOrder?.id, isDemoMode]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const s of FULFILMENT_LIFECYCLE_ORDER) {
      counts[s] = 0;
    }
    for (const o of orders) {
      counts[o.fulfilmentStatus] = (counts[o.fulfilmentStatus] ?? 0) + 1;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (initialStatusFilter !== 'all' && order.fulfilmentStatus !== initialStatusFilter) {
        return false;
      }
      if (channelFilter !== 'all' && order.channel !== channelFilter) {
        return false;
      }
      if (!q) return true;
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.partyId.toLowerCase().includes(q) ||
        order.partyDisplayName.toLowerCase().includes(q) ||
        order.regionCity.toLowerCase().includes(q)
      );
    });
  }, [orders, initialStatusFilter, channelFilter, searchQuery]);

  const handleFulfilmentTransition = async (
    order: OrderSummary,
    nextStatus: FulfilmentStatus
  ) => {
    if (isDemoMode) {
      onNotify('Sign in as an authorized administrator to update live Cloud Firestore orders.');
      return;
    }
    setMutatingAction(`status:${nextStatus}`);
    try {
      await transitionOrderFulfilment(order, nextStatus);
      onNotify(
        `Order ${order.orderNumber} updated to ${FULFILMENT_STATUS_META[nextStatus].label}.`
      );
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Status update rejected by security rules.');
    } finally {
      setMutatingAction(null);
    }
  };

  const handlePaymentSettlement = async (order: OrderSummary) => {
    if (isDemoMode) {
      onNotify('Sign in as an authorized administrator to settle order payments.');
      return;
    }
    setMutatingAction('payment:paid');
    try {
      await settleOrderPayment(order);
      onNotify(`Payment for ${order.orderNumber} marked as Paid Settled.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Payment settlement failed.');
    } finally {
      setMutatingAction(null);
    }
  };

  const handleSaveDispatchNotes = async () => {
    if (!selectedOrder || isDemoMode || !privateDetails) return;
    setMutatingAction('notes:save');
    try {
      await updateOrderDispatchNotes(selectedOrder.id, notesDraft);
      setPrivateDetails({
        ...privateDetails,
        dispatchNotes: notesDraft.trim().slice(0, VALIDATION_CONSTRAINTS.DISPATCH_NOTES_MAX_LENGTH),
      });
      onNotify(`Updated dispatch notes for ${selectedOrder.orderNumber}.`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Unable to update dispatch notes.');
    } finally {
      setMutatingAction(null);
    }
  };

  // Error State
  if (error) {
    return (
      <section
        role="alert"
        aria-label="Order Management Error"
        className="bg-white border border-red-200 rounded-xl p-8"
      >
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-red-700 mt-0.5 shrink-0" />
          <div className="space-y-3 min-w-0">
            <h1 className="text-lg font-bold text-slate-900">Unable to Query Orders Collection</h1>
            <p className="text-sm text-slate-600">
              Verify administrator permissions and Cloud Firestore connectivity.
            </p>
            <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 overflow-x-auto">
              {error}
            </pre>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Order Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Search, inspect, and execute validated status transitions across customer and dealer
            orders
          </p>
        </div>
        <div className="text-xs font-mono text-slate-600 tabular-nums">
          Showing {filteredOrders.length} of {orders.length} records
        </div>
      </div>

      {/* Search & Filter Controls */}
      <section
        aria-label="Order Search and Filters"
        className="bg-white border border-slate-200 rounded-xl p-4 space-y-4"
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order ref (ORD-2026...), customer/dealer ID (DLR-MH...), name, or city"
              aria-label="Search orders"
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-700 focus:outline-none transition-colors"
            />
          </div>

          {/* Channel Segmented Selector */}
          <div
            role="group"
            aria-label="Filter by sales channel"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0"
          >
            {(
              [
                { id: 'all', label: 'All Channels' },
                { id: 'customer', label: 'Retail' },
                { id: 'dealer', label: 'Wholesale' },
              ] as const
            ).map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannelFilter(ch.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  channelFilter === ch.id
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Fulfilment Status Filter Bar */}
        <div
          role="tablist"
          aria-label="Filter by fulfilment status"
          className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={initialStatusFilter === 'all'}
            onClick={() => onStatusFilterChange('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              initialStatusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({statusCounts.all ?? 0})
          </button>

          {FULFILMENT_LIFECYCLE_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={initialStatusFilter === status}
              onClick={() => onStatusFilterChange(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                initialStatusFilter === status
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {FULFILMENT_STATUS_META[status].actionVerb === 'Pending'
                ? 'Pending'
                : status.charAt(0).toUpperCase() + status.slice(1)}{' '}
              ({statusCounts[status] ?? 0})
            </button>
          ))}
        </div>
      </section>

      {/* Orders Table */}
      <section
        aria-label="Orders Table"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        {loading ? (
          <div className="p-6 space-y-3" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="h-11 bg-slate-50 rounded animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <h2 className="text-base font-bold text-slate-900">No Orders in Live Database</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cloud Firestore currently contains zero orders. Seed sample Califnco retail and
              wholesale orders to test status transitions and private shipping inspection.
            </p>
            {!isDemoMode && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSeeding}
                  onClick={onSeedFirestore}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>{isSeeding ? 'Seeding...' : 'Seed Sample Records'}</span>
                </button>
              </div>
            )}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <h2 className="text-base font-bold text-slate-900">No Matching Orders</h2>
            <p className="text-sm text-slate-600">
              No orders match your current search query or status filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setChannelFilter('all');
                onStatusFilterChange('all');
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 pl-6 pr-4 whitespace-nowrap">
                    Order Reference
                  </th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">
                    Customer / Dealer Identifier
                  </th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">
                    Order Date
                  </th>
                  <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">
                    Amount
                  </th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">
                    Payment Status
                  </th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">
                    Fulfilment Status
                  </th>
                  <th scope="col" className="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOrders.map((order) => {
                  const nextSteps = ALLOWED_FULFILMENT_TRANSITIONS[order.fulfilmentStatus];
                  const primaryForwardStep = nextSteps.find((s) => s !== 'cancelled');
                  const isSelected = selectedOrder?.id === order.id;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => onSelectOrder(order.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-teal-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 pl-6 pr-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-slate-900">
                          {order.orderNumber}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {order.itemCount} {order.itemCount === 1 ? 'unit' : 'units'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-xs font-medium text-slate-900">
                          {order.partyId}
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <span className="font-medium text-slate-800 truncate max-w-[180px]">
                            {order.partyDisplayName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500 truncate max-w-[130px]">
                            {order.regionCity}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-600 tabular-nums">
                        {formatOrderDate(order.orderDateIso)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatInr(order.totalAmount)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <span className={PAYMENT_STATUS_META[order.paymentStatus].toneClass}>
                          {PAYMENT_STATUS_META[order.paymentStatus].label}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <span className={FULFILMENT_STATUS_META[order.fulfilmentStatus].toneClass}>
                          {FULFILMENT_STATUS_META[order.fulfilmentStatus].label}
                        </span>
                      </td>

                      <td
                        className="py-3 pl-4 pr-6 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-3">
                          {!isDemoMode && primaryForwardStep && (
                            <button
                              type="button"
                              disabled={mutatingAction !== null}
                              onClick={() =>
                                handleFulfilmentTransition(order, primaryForwardStep)
                              }
                              className="px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                            >
                              {FULFILMENT_STATUS_META[primaryForwardStep].actionVerb}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectOrder(order.id)}
                            className="text-xs font-semibold text-slate-800 hover:text-teal-800 hover:underline whitespace-nowrap cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Order Details Slide-Over View */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
          onClick={() => onSelectOrder(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-drawer-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white h-full overflow-y-auto border-l border-slate-200 flex flex-col justify-between"
          >
            <div>
              {/* Drawer Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span>{selectedOrder.channel === 'dealer' ? 'Wholesale PO' : 'Retail Order'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{selectedOrder.partyId}</span>
                  </div>
                  <h2
                    id="order-detail-drawer-title"
                    className="font-mono text-lg font-bold text-slate-900 mt-0.5"
                  >
                    {selectedOrder.orderNumber}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectOrder(null)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close order details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Lifecycle Stepper */}
                <section aria-label="Fulfilment Lifecycle">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="font-semibold text-slate-800">Fulfilment Lifecycle</span>
                    <span className={FULFILMENT_STATUS_META[selectedOrder.fulfilmentStatus].toneClass}>
                      {FULFILMENT_STATUS_META[selectedOrder.fulfilmentStatus].label}
                    </span>
                  </div>

                  {selectedOrder.fulfilmentStatus === 'cancelled' ? (
                    <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                      This order was cancelled prior to dispatch and is permanently locked in a
                      terminal state. Payment status:{' '}
                      <strong>{PAYMENT_STATUS_META[selectedOrder.paymentStatus].label}</strong>.
                    </div>
                  ) : (
                    <ol className="grid grid-cols-5 gap-2">
                      {PROGRESS_STEPS.map((step, idx) => {
                        const currentIdx = PROGRESS_STEPS.indexOf(selectedOrder.fulfilmentStatus);
                        const completed = idx <= currentIdx;
                        return (
                          <li key={step} className="space-y-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                completed ? 'bg-teal-700' : 'bg-slate-200'
                              }`}
                            />
                            <span
                              className={`block text-[11px] truncate ${
                                completed ? 'font-semibold text-slate-900' : 'text-slate-400'
                              }`}
                            >
                              {step.charAt(0).toUpperCase() + step.slice(1)}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>

                {/* Status Transition Controls */}
                <section
                  aria-label="Order Status Update Controls"
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-900">
                      Authorized Status Transitions
                    </h3>
                    <span className="text-xs text-slate-500">
                      Validated by Firestore Security Rules
                    </span>
                  </div>

                  {isDemoMode ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-slate-600">
                        Status updates are disabled in Read-Only Demo Mode. Sign in as an
                        authorized administrator to mutate live records.
                      </p>
                      <button
                        type="button"
                        onClick={onGoogleSignIn}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Sign In to Update
                      </button>
                    </div>
                  ) : isTerminalFulfilmentStatus(selectedOrder.fulfilmentStatus) ? (
                    <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        Terminal state reached ({selectedOrder.fulfilmentStatus}). Further status
                        mutations are locked by backend rules.
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      {ALLOWED_FULFILMENT_TRANSITIONS[selectedOrder.fulfilmentStatus].map(
                        (nextState) => {
                          const isCancel = nextState === 'cancelled';
                          const buttonLabel =
                            isCancel && selectedOrder.paymentStatus === 'paid'
                              ? 'Cancel & Refund Order'
                              : FULFILMENT_STATUS_META[nextState].actionVerb;

                          return (
                            <button
                              key={nextState}
                              type="button"
                              disabled={mutatingAction !== null}
                              onClick={() =>
                                handleFulfilmentTransition(selectedOrder, nextState)
                              }
                              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer ${
                                isCancel
                                  ? 'text-red-700 bg-white border border-red-300 hover:bg-red-50'
                                  : 'text-white bg-teal-700 hover:bg-teal-800'
                              }`}
                            >
                              {mutatingAction === `status:${nextState}`
                                ? 'Updating...'
                                : buttonLabel}
                            </button>
                          );
                        }
                      )}

                      {canSettleOrderPayment(selectedOrder) && (
                        <button
                          type="button"
                          disabled={mutatingAction !== null}
                          onClick={() => handlePaymentSettlement(selectedOrder)}
                          className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                        >
                          {mutatingAction === 'payment:paid'
                            ? 'Recording...'
                            : 'Mark Payment Settled'}
                        </button>
                      )}
                    </div>
                  )}
                </section>

                {/* Financial & Summary Metadata */}
                <section aria-label="Order Summary Figures">
                  <h3 className="text-xs font-semibold text-slate-900 mb-3">
                    Account & Settlement Summary
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs border-t border-b border-slate-200 py-4">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Account Name</dt>
                      <dd className="font-medium text-slate-900 text-right">
                        {selectedOrder.partyDisplayName}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Identifier</dt>
                      <dd className="font-mono text-slate-900">{selectedOrder.partyId}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Submitted</dt>
                      <dd className="font-mono text-slate-900 tabular-nums">
                        {formatOrderDate(selectedOrder.orderDateIso)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Payment Status</dt>
                      <dd className={PAYMENT_STATUS_META[selectedOrder.paymentStatus].toneClass}>
                        {PAYMENT_STATUS_META[selectedOrder.paymentStatus].label}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Subtotal</dt>
                      <dd className="font-mono text-slate-900 tabular-nums">
                        {formatInr(selectedOrder.subtotalAmount)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Freight & Handling</dt>
                      <dd className="font-mono text-slate-900 tabular-nums">
                        {selectedOrder.deliveryAmount === 0
                          ? 'Free'
                          : formatInr(selectedOrder.deliveryAmount)}
                      </dd>
                    </div>
                    <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex justify-between gap-2 text-sm">
                      <dt className="font-semibold text-slate-900">Total Order Value</dt>
                      <dd className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatInr(selectedOrder.totalAmount)}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Line Items Table */}
                <section aria-label="Ordered Line Items">
                  <h3 className="text-xs font-semibold text-slate-900 mb-3">
                    Ordered Equipment & Consumables
                  </h3>
                  {detailLoading ? (
                    <div className="space-y-2">
                      <div className="h-9 bg-slate-100 rounded animate-pulse" />
                      <div className="h-9 bg-slate-100 rounded animate-pulse" />
                    </div>
                  ) : lineItems.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">
                      No SKU line items recorded for this order.
                    </p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                            <th scope="col" className="py-2.5 px-3">
                              Product / SKU
                            </th>
                            <th scope="col" className="py-2.5 px-3 text-right">
                              Qty
                            </th>
                            <th scope="col" className="py-2.5 px-3 text-right">
                              Unit
                            </th>
                            <th scope="col" className="py-2.5 px-3 text-right">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {lineItems.map((item) => (
                            <tr key={item.id}>
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-slate-900">
                                  {item.productName}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {item.sku} · {item.category}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                                {formatInr(item.unitPrice)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                                {formatInr(item.lineTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Isolated Recipient & Shipping PII Section */}
                <section aria-label="Isolated Recipient and Delivery Details">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-900">
                      Protected Delivery & Contact Record
                    </h3>
                    <span className="font-mono text-[11px] text-slate-500">
                      /private_details/shipping
                    </span>
                  </div>

                  {isDemoMode ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
                      <Lock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-800">
                          Customer PII Redacted in Unauthenticated Demo Mode
                        </p>
                        <p className="leading-relaxed">
                          Recipient phone numbers, personal emails, street addresses, and GSTIN
                          records are isolated in a protected subcollection and are never exposed
                          to unauthenticated sessions.
                        </p>
                      </div>
                    </div>
                  ) : detailLoading ? (
                    <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                  ) : detailError ? (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                      Failed to load protected shipping details: {detailError}
                    </div>
                  ) : privateDetails ? (
                    <div className="border border-slate-200 rounded-xl p-4 space-y-4 text-xs">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <dt className="text-slate-500">Recipient</dt>
                          <dd className="font-medium text-slate-900 mt-0.5">
                            {privateDetails.recipientName}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Phone</dt>
                          <dd className="font-mono text-slate-900 mt-0.5">
                            {privateDetails.phone}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Email</dt>
                          <dd className="font-mono text-slate-900 mt-0.5 break-all">
                            {privateDetails.email}
                          </dd>
                        </div>
                        {privateDetails.gstin && (
                          <div>
                            <dt className="text-slate-500">Dealer GSTIN</dt>
                            <dd className="font-mono text-slate-900 mt-0.5">
                              {privateDetails.gstin}
                            </dd>
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <dt className="text-slate-500">Delivery Street Address</dt>
                          <dd className="text-slate-900 mt-0.5 leading-relaxed">
                            {privateDetails.shippingAddress} — PIN{' '}
                            <span className="font-mono">{privateDetails.postalCode}</span>
                          </dd>
                        </div>
                      </dl>

                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <label
                          htmlFor="dispatch-notes-input"
                          className="block font-medium text-slate-700"
                        >
                          Warehouse & Installation Dispatch Notes
                        </label>
                        <textarea
                          id="dispatch-notes-input"
                          rows={2}
                          maxLength={VALIDATION_CONSTRAINTS.DISPATCH_NOTES_MAX_LENGTH}
                          disabled={isTerminalFulfilmentStatus(selectedOrder.fulfilmentStatus)}
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-teal-700 focus:outline-none disabled:opacity-60"
                        />
                        {!isTerminalFulfilmentStatus(selectedOrder.fulfilmentStatus) && (
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                              {notesDraft.length}/{VALIDATION_CONSTRAINTS.DISPATCH_NOTES_MAX_LENGTH}
                            </span>
                            <button
                              type="button"
                              disabled={
                                mutatingAction !== null ||
                                notesDraft.trim() === privateDetails.dispatchNotes
                              }
                              onClick={handleSaveDispatchNotes}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
                            >
                              {mutatingAction === 'notes:save' ? 'Saving...' : 'Save Notes'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No shipping record found for this order.
                    </p>
                  )}
                </section>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono truncate">Doc ID: {selectedOrder.id}</span>
              <button
                type="button"
                onClick={() => onSelectOrder(null)}
                className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
