import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Lock,
  RefreshCw,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import {
  fetchServicePrivateContact,
  updateServiceRequestTicket,
} from '../services/adminFirestoreService';
import {
  ALLOWED_SERVICE_TRANSITIONS,
  formatOrderDate,
  isTerminalServiceStatus,
  SERVICE_STATUS_META,
  VALIDATION_CONSTRAINTS,
  type ServiceRequest,
  type ServiceRequestCategory,
  type ServiceRequestPrivateContact,
  type ServiceTicketStatus,
} from '../types';

interface ServiceDeskPageProps {
  serviceRequests: ServiceRequest[];
  currentAdminUid: string | null;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  isSeeding: boolean;
  canSyncSamples: boolean;
  onSeedFirestore: () => void;
  onSyncSamples: () => void;
  onRetry: () => void;
  onGoogleSignIn: () => void;
  onInspectLinkedOrder: (orderId: string) => void;
  onNotify: (message: string) => void;
}

function isoToDatetimeLocal(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export const ServiceDeskPage: React.FC<ServiceDeskPageProps> = ({
  serviceRequests,
  currentAdminUid,
  loading,
  error,
  isDemoMode,
  isSeeding,
  canSyncSamples,
  onSeedFirestore,
  onSyncSamples,
  onRetry,
  onGoogleSignIn,
  onInspectLinkedOrder,
  onNotify,
}) => {
  const [statusFilter, setStatusFilter] = useState<ServiceTicketStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ServiceRequestCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Isolated Customer Site Contact State
  const [privateContact, setPrivateContact] = useState<ServiceRequestPrivateContact | null>(null);
  const [contactLoading, setContactLoading] = useState<boolean>(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Editable Resolution Notes & Scheduled Slot
  const [notesDraft, setNotesDraft] = useState<string>('');
  const [scheduleDraft, setScheduleDraft] = useState<string>('');
  const [updateBusy, setUpdateBusy] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const selectedTicket = useMemo(
    () => serviceRequests.find((t) => t.id === selectedTicketId) ?? null,
    [serviceRequests, selectedTicketId]
  );

  useEffect(() => {
    if (!selectedTicket) {
      setPrivateContact(null);
      setContactError(null);
      setUpdateError(null);
      return;
    }

    setNotesDraft(selectedTicket.resolutionNotes || '');
    setScheduleDraft(isoToDatetimeLocal(selectedTicket.scheduledDateIso));
    setUpdateError(null);

    if (isDemoMode) {
      setPrivateContact(null);
      setContactLoading(false);
      setContactError(null);
      return;
    }

    let cancelled = false;
    setContactLoading(true);
    setContactError(null);

    fetchServicePrivateContact(selectedTicket.id)
      .then((res) => {
        if (!cancelled) {
          setPrivateContact(res);
          setContactLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setContactError(err instanceof Error ? err.message : String(err));
          setContactLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTicket, isDemoMode]);

  const counts = useMemo(() => {
    const open = serviceRequests.filter((t) => t.status === 'open').length;
    const activeField = serviceRequests.filter(
      (t) => t.status === 'scheduled' || t.status === 'in_progress'
    ).length;
    const resolved = serviceRequests.filter((t) => t.status === 'completed').length;
    const installation = serviceRequests.filter((t) => t.requestCategory === 'Installation').length;
    const maintenance = serviceRequests.filter((t) => t.requestCategory === 'Maintenance').length;
    const repair = serviceRequests.filter((t) => t.requestCategory === 'Repair').length;

    return {
      total: serviceRequests.length,
      open,
      activeField,
      resolved,
      installation,
      maintenance,
      repair,
    };
  }, [serviceRequests]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return serviceRequests.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && t.requestCategory !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerCode.toLowerCase().includes(q) ||
        t.customerDisplayName.toLowerCase().includes(q) ||
        t.orderNumber.toLowerCase().includes(q) ||
        t.serviceType.toLowerCase().includes(q) ||
        t.requestCategory.toLowerCase().includes(q) ||
        t.productModel.toLowerCase().includes(q) ||
        t.regionCity.toLowerCase().includes(q)
      );
    });
  }, [serviceRequests, statusFilter, categoryFilter, searchQuery]);

  const handleApplyTicketUpdate = async (targetStatus: ServiceTicketStatus) => {
    if (!selectedTicket || !currentAdminUid || isDemoMode) return;
    setUpdateError(null);

    const parsedScheduleIso = scheduleDraft
      ? new Date(scheduleDraft).toISOString()
      : selectedTicket.scheduledDateIso;

    setUpdateBusy(true);
    try {
      await updateServiceRequestTicket({
        ticket: selectedTicket,
        adminUid: currentAdminUid,
        nextStatus: targetStatus,
        scheduledDateIso: parsedScheduleIso,
        resolutionNotes: notesDraft,
      });

      const statusChanged = targetStatus !== selectedTicket.status;
      onNotify(
        statusChanged
          ? `Updated ${selectedTicket.ticketNumber} to "${SERVICE_STATUS_META[targetStatus].label}".`
          : `Saved resolution notes and schedule for ${selectedTicket.ticketNumber}.`
      );
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdateBusy(false);
    }
  };

  if (error) {
    return (
      <section
        role="alert"
        aria-label="Service Desk Error"
        className="bg-white border border-red-200 rounded-xl p-8"
      >
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-red-700 mt-0.5 shrink-0" />
          <div className="space-y-3 min-w-0">
            <h1 className="text-lg font-bold text-slate-900">
              Unable to Load Service Desk Queue
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cloud Firestore returned an error while reading customer service requests. Check your
              administrator credentials and try again.
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

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading service desk requests">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-96 max-w-full bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="h-3.5 w-28 bg-slate-100 rounded animate-pulse" />
              <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-11 w-full bg-slate-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const allowedNextStatuses = selectedTicket
    ? ALLOWED_SERVICE_TRANSITIONS[selectedTicket.status]
    : [];
  const isTicketTerminal = selectedTicket ? isTerminalServiceStatus(selectedTicket.status) : false;

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Service Desk
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Water purifier installation, preventive filter maintenance, and technician repair
            dispatch queue
            {isDemoMode ? ' · Demo Dataset' : ' · Cloud Firestore Live'}
          </p>
        </div>

        {!isDemoMode && canSyncSamples && serviceRequests.length > 0 && (
          <button
            type="button"
            disabled={isSeeding}
            onClick={onSyncSamples}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-teal-700" />
            <span>{isSeeding ? 'Syncing Samples...' : 'Load Additional Sample Tickets'}</span>
          </button>
        )}
      </div>

      {/* 4-Column Summary Strip */}
      <section aria-label="Service Desk Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs font-medium text-slate-500">Open (Unscheduled)</span>
            <div className="mt-2 font-mono text-3xl font-semibold text-amber-700 tabular-nums">
              {counts.open}
            </div>
            <p className="mt-2 text-xs text-slate-500">Requires technician slot assignment</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs font-medium text-slate-500">Scheduled &amp; On-Site</span>
            <div className="mt-2 font-mono text-3xl font-semibold text-teal-800 tabular-nums">
              {counts.activeField}
            </div>
            <p className="mt-2 text-xs text-slate-500">Active field technician dispatches</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs font-medium text-slate-500">Resolved Requests</span>
            <div className="mt-2 font-mono text-3xl font-semibold text-emerald-700 tabular-nums">
              {counts.resolved}
            </div>
            <p className="mt-2 text-xs text-slate-500">Completed with logged TDS &amp; notes</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs font-medium text-slate-500">Queue by Category</span>
            <div className="mt-2 font-mono text-sm font-semibold text-slate-900 tabular-nums">
              {counts.installation} Install · {counts.maintenance} Maint · {counts.repair} Repair
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Total recorded requests: <span className="font-mono">{counts.total}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Empty Firestore Collection State */}
      {serviceRequests.length === 0 ? (
        <section className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <h2 className="text-lg font-bold text-slate-900">
              No Service Requests in Cloud Firestore
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your Cloud Firestore <code className="font-mono text-xs">/service_requests</code>{' '}
              collection has zero tickets. Seed sample RO installation, maintenance, and repair
              requests to test live status updates and resolution notes.
            </p>
            {!isDemoMode && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSeeding}
                  onClick={onSeedFirestore}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>
                    {isSeeding ? 'Seeding Cloud Firestore...' : 'Seed Sample Service Tickets'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section
          aria-label="Customer Service Requests Table"
          className="bg-white border border-slate-200 rounded-xl overflow-hidden"
        >
          {/* Filter & Search Toolbar */}
          <div className="p-4 sm:px-6 border-b border-slate-200 space-y-3">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              {/* Status Filter Bar */}
              <div
                role="tablist"
                aria-label="Filter service requests by status"
                className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit"
              >
                {(
                  [
                    { id: 'all', label: 'All Statuses' },
                    { id: 'open', label: 'Open' },
                    { id: 'scheduled', label: 'Scheduled' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'completed', label: 'Resolved' },
                    { id: 'cancelled', label: 'Cancelled' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative w-full xl:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reference, customer ID, purifier..."
                  aria-label="Search customer service requests"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-700"
                />
              </div>
            </div>

            {/* Request Type Filter Bar (Installation / Maintenance / Repair) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div
                role="group"
                aria-label="Filter by purifier request type"
                className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit"
              >
                {(
                  [
                    { id: 'all', label: 'All Request Types' },
                    { id: 'Installation', label: `Installation (${counts.installation})` },
                    { id: 'Maintenance', label: `Maintenance (${counts.maintenance})` },
                    { id: 'Repair', label: `Repair (${counts.repair})` },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono tabular-nums ${
                      categoryFilter === cat.id
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500 font-mono tabular-nums">
                Showing {filteredTickets.length} of {serviceRequests.length} requests
              </span>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                No service requests match your current filters
              </p>
              <p className="text-xs text-slate-500">
                Reset status, request type, or search filters to view the full service desk queue.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setSearchQuery('');
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
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
                      Request Reference
                    </th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">
                      Customer Identifier
                    </th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">
                      Request Type
                    </th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">
                      Submission Date
                    </th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">
                      Status
                    </th>
                    <th scope="col" className="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTickets.map((ticket) => {
                    const statusMeta = SERVICE_STATUS_META[ticket.status];
                    return (
                      <tr
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 pl-6 pr-4 whitespace-nowrap">
                          <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                            {ticket.ticketNumber}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            Order {ticket.orderNumber}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 truncate max-w-[230px]">
                            {ticket.customerDisplayName}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 whitespace-nowrap mt-0.5">
                            <span className="font-mono">{ticket.customerCode}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[150px]">{ticket.regionCity}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 whitespace-nowrap">
                            {ticket.serviceType}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>{ticket.requestCategory}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[200px]">{ticket.productModel}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600 tabular-nums">
                          <div>{formatOrderDate(ticket.submissionDateIso)}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Slot: {formatOrderDate(ticket.scheduledDateIso)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          <span className={statusMeta.toneClass}>{statusMeta.label}</span>
                        </td>

                        <td className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicketId(ticket.id);
                            }}
                            className="text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline cursor-pointer"
                          >
                            {isTerminalServiceStatus(ticket.status) ? 'View Notes' : 'Manage'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Service Request Details & Resolution Slide-Over Drawer */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-ticket-drawer-title"
        >
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl border-l border-slate-200 flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 flex items-center gap-2 font-mono tabular-nums">
                    <span>{selectedTicket.ticketNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedTicket.requestCategory}</span>
                    <span aria-hidden="true">·</span>
                    <span className={SERVICE_STATUS_META[selectedTicket.status].toneClass}>
                      {SERVICE_STATUS_META[selectedTicket.status].label}
                    </span>
                  </div>
                  <h2
                    id="service-ticket-drawer-title"
                    className="mt-1 text-xl font-bold text-slate-900 truncate"
                  >
                    {selectedTicket.serviceType}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicketId(null)}
                  aria-label="Close service request details"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Section 1: Request & Equipment Details */}
                <section aria-label="Service Request Details" className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      01. Request &amp; Purifier Details
                    </h3>
                    {selectedTicket.orderId === 'DIRECT-SERVICE' ? (
                      <span className="text-xs text-slate-500 font-mono">
                        Direct Mobile Booking
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const orderId = selectedTicket.orderId;
                          setSelectedTicketId(null);
                          onInspectLinkedOrder(orderId);
                        }}
                        className="text-xs font-semibold text-teal-800 hover:underline font-mono cursor-pointer"
                      >
                        Inspect Order {selectedTicket.orderNumber}
                      </button>
                    )}
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <dt className="text-slate-500">Customer Identifier</dt>
                      <dd className="mt-0.5 font-semibold text-slate-900">
                        {selectedTicket.customerDisplayName}{' '}
                        <span className="font-mono text-slate-500 font-normal">
                          ({selectedTicket.customerCode})
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Service Region</dt>
                      <dd className="mt-0.5 font-medium text-slate-900">
                        {selectedTicket.regionCity}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Submission Date</dt>
                      <dd className="mt-0.5 font-mono text-slate-800 tabular-nums">
                        {formatOrderDate(selectedTicket.submissionDateIso)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">
                        {selectedTicket.status === 'open'
                          ? 'Preferred Service Date (Unconfirmed)'
                          : 'Scheduled Technician Slot'}
                      </dt>
                      <dd className="mt-0.5 font-mono text-slate-800 tabular-nums">
                        {formatOrderDate(selectedTicket.scheduledDateIso)}
                        {selectedTicket.preferredTimeSlot
                          ? ` · ${selectedTicket.preferredTimeSlot}`
                          : ''}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Water Purifier / Hardware Unit</dt>
                      <dd className="mt-0.5 font-semibold text-slate-900 flex items-center gap-2">
                        <Wrench className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        <span>{selectedTicket.productModel}</span>
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Customer Reported Details</dt>
                      <dd className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed">
                        {selectedTicket.requestDetails}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Section 2: Isolated On-Site Contact & Water TDS Details */}
                <section
                  aria-label="On-Site Dispatch Contact"
                  className="pt-5 border-t border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      02. On-Site Location &amp; Input Water Profile
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Isolated PII Subcollection
                    </span>
                  </div>

                  {isDemoMode ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Customer Street Address &amp; Phone Protected in Demo Mode</span>
                      </div>
                      <p className="leading-relaxed">
                        Private service location details live in{' '}
                        <code className="font-mono">
                          /service_requests/{selectedTicket.id}/private_details/contact
                        </code>{' '}
                        with <code className="font-mono">allow list: if false</code>. Sign in as an
                        authorized administrator to view dispatch coordinates and update tickets.
                      </p>
                      <button
                        type="button"
                        onClick={onGoogleSignIn}
                        className="font-semibold text-teal-800 hover:underline cursor-pointer"
                      >
                        Sign in as Administrator
                      </button>
                    </div>
                  ) : contactLoading ? (
                    <div className="space-y-2 py-2">
                      <div className="h-4 w-52 bg-slate-100 rounded animate-pulse" />
                      <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
                    </div>
                  ) : contactError ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      Unable to load isolated service contact: {contactError}
                    </div>
                  ) : privateContact ? (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                      <div>
                        <dt className="text-slate-500">On-Site Contact</dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">
                          {privateContact.contactName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Contact Phone</dt>
                        <dd className="mt-0.5 font-mono text-slate-900 tabular-nums">
                          {privateContact.phone}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-slate-500">Service Street Address</dt>
                        <dd className="mt-0.5 font-medium text-slate-900">
                          {privateContact.serviceAddress}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Measured Input Water TDS</dt>
                        <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                          {privateContact.waterSourceTdsPpm} ppm
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No isolated contact subdocument recorded for this legacy service ticket.
                    </p>
                  )}
                </section>

                {/* Section 3: Status Update & Resolution Notes */}
                <section
                  aria-label="Update Status and Resolution Notes"
                  className="pt-5 border-t border-slate-200 space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-900">
                    03. Update Status &amp; Resolution Notes
                  </h3>

                  {updateError && (
                    <div
                      role="alert"
                      className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
                    >
                      {updateError}
                    </div>
                  )}

                  {isTicketTerminal ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <div className="font-bold text-slate-900">
                        Ticket Locked in Final Status:{' '}
                        <span className={SERVICE_STATUS_META[selectedTicket.status].toneClass}>
                          {SERVICE_STATUS_META[selectedTicket.status].label}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Recorded Resolution Notes</span>
                        <p className="mt-1 text-slate-900 leading-relaxed">
                          {selectedTicket.resolutionNotes ||
                            'Completed prior to resolution note logging.'}
                        </p>
                      </div>
                      {selectedTicket.updatedAtIso && (
                        <div className="pt-2 border-t border-slate-200 font-mono text-[11px] text-slate-500 tabular-nums">
                          Last Updated: {formatOrderDate(selectedTicket.updatedAtIso)}
                        </div>
                      )}
                    </div>
                  ) : isDemoMode ? (
                    <div className="space-y-3">
                      {selectedTicket.resolutionNotes && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                          <span className="text-slate-500 block mb-1">Current Dispatch Notes</span>
                          <p className="text-slate-800">{selectedTicket.resolutionNotes}</p>
                        </div>
                      )}
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
                        <span>
                          Status updates and resolution note persistence require Administrator Sign
                          In.
                        </span>
                        <button
                          type="button"
                          onClick={onGoogleSignIn}
                          className="px-3.5 py-2 font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Sign In to Update
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="service-schedule-input"
                          className="block text-xs font-medium text-slate-700 mb-1"
                        >
                          Scheduled Technician Visit Window
                        </label>
                        <input
                          id="service-schedule-input"
                          type="datetime-local"
                          value={scheduleDraft}
                          onChange={(e) => setScheduleDraft(e.target.value)}
                          disabled={updateBusy}
                          className="w-full sm:w-72 px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <label
                            htmlFor="service-resolution-notes"
                            className="text-xs font-medium text-slate-700"
                          >
                            Technician &amp; Resolution Notes (required when resolving or
                            cancelling)
                          </label>
                          <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                            {notesDraft.trim().length} /{' '}
                            {VALIDATION_CONSTRAINTS.RESOLUTION_NOTES_MAX_LENGTH}
                          </span>
                        </div>
                        <textarea
                          id="service-resolution-notes"
                          rows={4}
                          maxLength={VALIDATION_CONSTRAINTS.RESOLUTION_NOTES_MAX_LENGTH}
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          disabled={updateBusy}
                          placeholder="Record replaced cartridges, membrane psi pressure, calibrated output TDS (ppm), or technician assignment..."
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        {/* Save Notes / Schedule without status change */}
                        <button
                          type="button"
                          disabled={updateBusy}
                          onClick={() => handleApplyTicketUpdate(selectedTicket.status)}
                          className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Save Notes &amp; Schedule
                        </button>

                        {/* Validated Status Step Actions */}
                        {allowedNextStatuses.map((nextState) => {
                          const isCancel = nextState === 'cancelled';
                          const isResolve = nextState === 'completed';
                          return (
                            <button
                              key={nextState}
                              type="button"
                              disabled={updateBusy}
                              onClick={() => handleApplyTicketUpdate(nextState)}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap ${
                                isResolve
                                  ? 'bg-teal-700 text-white hover:bg-teal-800'
                                  : isCancel
                                    ? 'bg-white text-red-700 border border-red-300 hover:bg-red-50'
                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              {isResolve && <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span>{SERVICE_STATUS_META[nextState].actionVerb}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
