import React, { useMemo } from 'react';
import { ArrowRight, RefreshCw, Database, AlertCircle } from 'lucide-react';
import {
  FULFILMENT_LIFECYCLE_ORDER,
  FULFILMENT_STATUS_META,
  PAYMENT_STATUS_META,
  formatInr,
  formatOrderDate,
  type DealerSummary,
  type FulfilmentStatus,
  type OrderSummary,
  type ServiceRequest,
} from '../types';

interface AdminDashboardPageProps {
  orders: OrderSummary[];
  dealers: DealerSummary[];
  serviceRequests: ServiceRequest[];
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  isSeeding: boolean;
  onRetry: () => void;
  onSeedFirestore: () => void;
  onInspectOrder: (orderId: string) => void;
  onFilterOrdersByStatus: (status: FulfilmentStatus | 'all') => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  orders,
  dealers,
  serviceRequests,
  loading,
  error,
  isDemoMode,
  isSeeding,
  onRetry,
  onSeedFirestore,
  onInspectOrder,
  onFilterOrdersByStatus,
}) => {
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const grossRevenue = orders
      .filter((o) => o.fulfilmentStatus !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingOrders = orders.filter((o) => o.fulfilmentStatus === 'pending').length;
    const activeFulfilmentQueue = orders.filter(
      (o) => !['delivered', 'cancelled'].includes(o.fulfilmentStatus)
    ).length;

    const approvedDealers = dealers.filter((d) => d.approvalStatus === 'approved').length;
    const pendingDealers = dealers.filter((d) => d.approvalStatus === 'pending').length;

    const activeServiceRequests = serviceRequests.filter(
      (s) => s.status === 'open' || s.status === 'scheduled'
    ).length;
    const openUrgentTickets = serviceRequests.filter((s) => s.status === 'open').length;

    return {
      totalOrders,
      grossRevenue,
      pendingOrders,
      activeFulfilmentQueue,
      approvedDealers,
      pendingDealers,
      activeServiceRequests,
      openUrgentTickets,
      totalServiceTickets: serviceRequests.length,
    };
  }, [orders, dealers, serviceRequests]);

  const statusBreakdown = useMemo(() => {
    const total = orders.length;
    return FULFILMENT_LIFECYCLE_ORDER.map((status) => {
      const matching = orders.filter((o) => o.fulfilmentStatus === status);
      const count = matching.length;
      const amount = matching.reduce((sum, o) => sum + o.totalAmount, 0);
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        status,
        label: FULFILMENT_STATUS_META[status].label,
        toneClass: FULFILMENT_STATUS_META[status].toneClass,
        count,
        amount,
        percentage,
      };
    });
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  // Error State
  if (error) {
    return (
      <section
        role="alert"
        aria-label="Dashboard Data Error"
        className="bg-white border border-red-200 rounded-xl p-8"
      >
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-red-700 mt-0.5 shrink-0" />
          <div className="space-y-3 min-w-0">
            <h1 className="text-lg font-bold text-slate-900">
              Unable to Load Operational Telemetry
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed break-words">
              Cloud Firestore returned an error while reading administration collections. Verify
              your administrator authorization and network connectivity.
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
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard data">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-96 max-w-full bg-slate-100 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="h-3.5 w-28 bg-slate-100 rounded animate-pulse" />
              <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-40 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-10 w-full bg-slate-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Administration Overview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Retail residential orders, commercial dealer procurement, and technician service queue
            {isDemoMode ? ' · Demo Dataset' : ' · Cloud Firestore Live'}
          </p>
        </div>
      </div>

      {/* 4-Column Summary Cards Strip */}
      <section aria-label="Operational Summary Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Total Orders */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Total Orders</span>
            <div className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {metrics.totalOrders}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Net Order Volume</span>
              <span className="font-mono font-medium text-slate-900 tabular-nums">
                {formatInr(metrics.grossRevenue)}
              </span>
            </div>
          </div>

          {/* Card 2: Pending Orders */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Orders</span>
            <div className="mt-2 font-mono text-3xl font-semibold text-amber-700 tabular-nums">
              {metrics.pendingOrders}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Active Fulfilment Queue</span>
              <span className="font-mono font-medium text-slate-900 tabular-nums">
                {metrics.activeFulfilmentQueue} open
              </span>
            </div>
          </div>

          {/* Card 3: Approved Dealers */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Approved Dealers</span>
            <div className="mt-2 font-mono text-3xl font-semibold text-teal-800 tabular-nums">
              {metrics.approvedDealers}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Pending Verification</span>
              <span className="font-mono font-medium text-slate-900 tabular-nums">
                {metrics.pendingDealers} applications
              </span>
            </div>
          </div>

          {/* Card 4: Service Requests */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Service Requests</span>
            <div className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {metrics.activeServiceRequests}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Unscheduled Dispatch</span>
              <span className="font-mono font-medium text-slate-900 tabular-nums">
                {metrics.openUrgentTickets} of {metrics.totalServiceTickets}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Empty State when Live Firestore has 0 documents */}
      {orders.length === 0 ? (
        <section className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <h2 className="text-lg font-bold text-slate-900">
              No Orders Recorded in Cloud Firestore
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your Cloud Firestore database is connected and secured, with zero order documents
              currently stored. Seed sample Califnco retail and dealer orders to test live status
              transitions and isolated shipping inspection.
            </p>
            {!isDemoMode && (
              <div className="pt-3">
                <button
                  type="button"
                  disabled={isSeeding}
                  onClick={onSeedFirestore}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>
                    {isSeeding
                      ? 'Writing Atomic Batch to Firestore...'
                      : 'Seed Sample Records to Firestore'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* Order Status Overview Section */}
          <section
            aria-labelledby="status-overview-heading"
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2
                  id="status-overview-heading"
                  className="text-base font-bold text-slate-900 tracking-tight"
                >
                  Order Status Overview
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select any lifecycle stage to filter the Order Management queue
                </p>
              </div>
              <button
                type="button"
                onClick={() => onFilterOrdersByStatus('all')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Open Full Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {statusBreakdown.map((item) => (
                <button
                  key={item.status}
                  type="button"
                  onClick={() => onFilterOrdersByStatus(item.status)}
                  className="w-full px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <div className="sm:w-56 shrink-0">
                    <span className={`text-sm ${item.toneClass}`}>{item.label}</span>
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-700 rounded-full transition-opacity duration-150"
                        style={{ width: `${Math.max(item.percentage, item.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-xs text-slate-500 tabular-nums">
                      {item.percentage}%
                    </span>
                  </div>

                  <div className="sm:w-56 flex items-center justify-between sm:justify-end gap-6 shrink-0 font-mono text-xs tabular-nums">
                    <span className="text-slate-700">
                      {item.count} {item.count === 1 ? 'order' : 'orders'}
                    </span>
                    <span className="w-28 text-right font-medium text-slate-900">
                      {formatInr(item.amount)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Recent Orders Table Section */}
          <section
            aria-labelledby="recent-orders-heading"
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2
                  id="recent-orders-heading"
                  className="text-base font-bold text-slate-900 tracking-tight"
                >
                  Recent Orders
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest retail and dealer purchase orders sorted by submission timestamp
                </p>
              </div>
              <button
                type="button"
                onClick={() => onFilterOrdersByStatus('all')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>View All {orders.length} Orders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th scope="col" className="py-3 pl-6 pr-4 whitespace-nowrap">
                      Order Reference
                    </th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">
                      Customer / Dealer
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
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => onInspectOrder(order.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 pl-6 pr-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 truncate max-w-[240px]">
                          {order.partyDisplayName}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-mono">{order.partyId}</span>
                          <span aria-hidden="true">·</span>
                          <span>{order.channel === 'dealer' ? 'Wholesale' : 'Retail'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[140px]">{order.regionCity}</span>
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
                      <td className="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectOrder(order.id);
                          }}
                          className="text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
