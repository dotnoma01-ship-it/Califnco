import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  approveDealerApplication,
  fetchDealerApplicationDetails,
  rejectDealerApplication,
} from '../services/adminFirestoreService';
import {
  DEALER_APPROVAL_META,
  formatInr,
  formatOrderDate,
  VALIDATION_CONSTRAINTS,
  WHOLESALE_TIER_PRESETS,
  type DealerApplicationReviewDetails,
  type DealerApprovalStatus,
  type DealerSummary,
} from '../types';

interface DealerApprovalPageProps {
  dealers: DealerSummary[];
  currentAdminUid: string | null;
  loading: boolean;
  error: string | null;
  isDemoMode: boolean;
  isSeeding: boolean;
  canSyncSamples: boolean;
  initialFilter?: DealerApprovalStatus | 'all';
  onFilterChange?: (filter: DealerApprovalStatus | 'all') => void;
  onSeedFirestore: () => void;
  onSyncSamples: () => void;
  onRetry: () => void;
  onGoogleSignIn: () => void;
  onNotify: (message: string) => void;
}

const REJECTION_TEMPLATES = [
  'GSTIN registration status could not be verified as active on the commercial tax portal.',
  'Submitted warehouse address lacks commercial dock access required for wholesale pallet dispatch.',
  'Applicant trade license territory overlaps an exclusive existing Tier 1 dealership zone.',
];

export const DealerApprovalPage: React.FC<DealerApprovalPageProps> = ({
  dealers,
  currentAdminUid,
  loading,
  error,
  isDemoMode,
  isSeeding,
  canSyncSamples,
  initialFilter = 'pending',
  onFilterChange,
  onSeedFirestore,
  onSyncSamples,
  onRetry,
  onGoogleSignIn,
  onNotify,
}) => {
  const [statusFilter, setStatusFilter] = useState<DealerApprovalStatus | 'all'>(initialFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);

  // Isolated Review Details Subcollection State
  const [reviewDetails, setReviewDetails] = useState<DealerApplicationReviewDetails | null>(null);
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Decision Form State
  const [selectedTier, setSelectedTier] = useState<string>(WHOLESALE_TIER_PRESETS[1].tierLabel);
  const [creditLimitInput, setCreditLimitInput] = useState<number>(
    WHOLESALE_TIER_PRESETS[1].defaultCreditLimit
  );
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  useEffect(() => {
    setStatusFilter(initialFilter);
  }, [initialFilter]);

  const selectedDealer = useMemo(
    () => dealers.find((d) => d.id === selectedDealerId) ?? null,
    [dealers, selectedDealerId]
  );

  // Load isolated /dealers/{id}/application_details/review when a dealer is opened in Live Firestore mode
  useEffect(() => {
    if (!selectedDealer) {
      setReviewDetails(null);
      setReviewError(null);
      setDecisionError(null);
      return;
    }

    setDecisionError(null);
    setRejectionReason(selectedDealer.rejectionReason || '');
    const matchingPreset = WHOLESALE_TIER_PRESETS.find(
      (p) => p.tierLabel === selectedDealer.wholesaleTier
    );
    if (matchingPreset) {
      setSelectedTier(matchingPreset.tierLabel);
      setCreditLimitInput(
        selectedDealer.creditLimit >= VALIDATION_CONSTRAINTS.DEALER_CREDIT_MIN_APPROVED
          ? selectedDealer.creditLimit
          : matchingPreset.defaultCreditLimit
      );
    } else {
      setSelectedTier(WHOLESALE_TIER_PRESETS[1].tierLabel);
      setCreditLimitInput(WHOLESALE_TIER_PRESETS[1].defaultCreditLimit);
    }

    if (isDemoMode) {
      setReviewDetails(null);
      setReviewLoading(false);
      setReviewError(null);
      return;
    }

    let cancelled = false;
    setReviewLoading(true);
    setReviewError(null);

    fetchDealerApplicationDetails(selectedDealer.id)
      .then((res) => {
        if (!cancelled) {
          setReviewDetails(res);
          setReviewLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setReviewError(err instanceof Error ? err.message : String(err));
          setReviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDealer, isDemoMode]);

  const counts = useMemo(() => {
    const pending = dealers.filter((d) => d.approvalStatus === 'pending').length;
    const approved = dealers.filter((d) => d.approvalStatus === 'approved').length;
    const rejected = dealers.filter((d) => d.approvalStatus === 'rejected').length;
    const totalCreditLimit = dealers
      .filter((d) => d.approvalStatus === 'approved')
      .reduce((sum, d) => sum + d.creditLimit, 0);
    return {
      all: dealers.length,
      pending,
      approved,
      rejected,
      totalCreditLimit,
    };
  }, [dealers]);

  const filteredDealers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dealers.filter((d) => {
      if (statusFilter !== 'all' && d.approvalStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        d.businessName.toLowerCase().includes(q) ||
        d.dealerCode.toLowerCase().includes(q) ||
        d.contactPerson.toLowerCase().includes(q) ||
        d.gstin.toLowerCase().includes(q) ||
        d.regionCity.toLowerCase().includes(q) ||
        d.businessType.toLowerCase().includes(q)
      );
    });
  }, [dealers, statusFilter, searchQuery]);

  const handleSelectTab = (next: DealerApprovalStatus | 'all') => {
    setStatusFilter(next);
    onFilterChange?.(next);
  };

  const handleTierPresetChange = (tierLabel: string) => {
    setSelectedTier(tierLabel);
    const preset = WHOLESALE_TIER_PRESETS.find((p) => p.tierLabel === tierLabel);
    if (preset) {
      setCreditLimitInput(preset.defaultCreditLimit);
    }
  };

  const handleApprove = async () => {
    if (!selectedDealer || !currentAdminUid || isDemoMode) return;
    setDecisionError(null);
    setActionBusy(true);
    try {
      await approveDealerApplication({
        dealer: selectedDealer,
        adminUid: currentAdminUid,
        wholesaleTier: selectedTier,
        creditLimit: creditLimitInput,
      });
      onNotify(
        `Approved ${selectedDealer.businessName} (${selectedDealer.dealerCode}) as ${selectedTier}.`
      );
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDealer || !currentAdminUid || isDemoMode) return;
    setDecisionError(null);
    if (rejectionReason.trim().length < VALIDATION_CONSTRAINTS.REJECTION_REASON_MIN_LENGTH) {
      setDecisionError(
        `Enter a specific rejection reason (at least ${VALIDATION_CONSTRAINTS.REJECTION_REASON_MIN_LENGTH} characters) before rejecting this application.`
      );
      return;
    }

    setActionBusy(true);
    try {
      await rejectDealerApplication({
        dealer: selectedDealer,
        adminUid: currentAdminUid,
        rejectionReason,
      });
      onNotify(
        `Rejected application for ${selectedDealer.businessName} (${selectedDealer.dealerCode}).`
      );
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionBusy(false);
    }
  };

  if (error) {
    return (
      <section
        role="alert"
        aria-label="Dealer Directory Error"
        className="bg-white border border-red-200 rounded-xl p-8"
      >
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-red-700 mt-0.5 shrink-0" />
          <div className="space-y-3 min-w-0">
            <h1 className="text-lg font-bold text-slate-900">
              Unable to Load Dealer Applications
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cloud Firestore denied or failed the dealer directory query. Confirm your verified
              administrator credentials and retry.
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
      <div className="space-y-6" aria-busy="true" aria-label="Loading dealer applications">
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

  const isSelfOwnedApplication =
    Boolean(selectedDealer) &&
    Boolean(currentAdminUid) &&
    selectedDealer?.ownerUid === currentAdminUid;

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Dealer Approval
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review commercial wholesale onboarding applications, verify GSTIN compliance, and manage
            B2B mobile catalog access
            {isDemoMode ? ' · Demo Dataset' : ' · Cloud Firestore Live'}
          </p>
        </div>

        {!isDemoMode && canSyncSamples && dealers.length > 0 && (
          <button
            type="button"
            disabled={isSeeding}
            onClick={onSyncSamples}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-teal-700" />
            <span>{isSeeding ? 'Syncing Samples...' : 'Load Additional Sample Applications'}</span>
          </button>
        )}
      </div>

      {/* 4-Column Summary Strip */}
      <section aria-label="Dealer Onboarding Summary">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs font-medium text-slate-500">Pending Applications</span>
            <div className="mt-2 font-mono text-3xl font-semibold text-amber-700 tabular-nums">
              {counts.pending}
            </div>
            <p className="mt-2 text-xs text-slate-500">Awaiting GSTIN &amp; warehouse review</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs font-medium text-slate-500">Approved Dealers</span>
            <div className="mt-2 font-mono text-3xl font-semibold text-emerald-700 tabular-nums">
              {counts.approved}
            </div>
            <p className="mt-2 text-xs text-slate-500">Authorized for wholesale mobile checkout</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs font-medium text-slate-500">Rejected Applications</span>
            <div className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {counts.rejected}
            </div>
            <p className="mt-2 text-xs text-slate-500">Declined with recorded compliance reason</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <span className="text-xs font-medium text-slate-500">Authorized Net-30 Credit</span>
            <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
              {formatInr(counts.totalCreditLimit)}
            </div>
            <p className="mt-2 text-xs text-slate-500">Total active B2B partner credit line</p>
          </div>
        </div>
      </section>

      {/* Empty Firestore Collection State */}
      {dealers.length === 0 ? (
        <section className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <h2 className="text-lg font-bold text-slate-900">
              No Dealer Applications in Cloud Firestore
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your Cloud Firestore <code className="font-mono text-xs">/dealers</code> collection is
              currently empty. Seed sample pending, approved, and rejected dealer applications to
              verify administrative review workflows.
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
                    {isSeeding ? 'Seeding Cloud Firestore...' : 'Seed Sample Applications'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section
          aria-label="Dealer Applications Directory"
          className="bg-white border border-slate-200 rounded-xl overflow-hidden"
        >
          {/* Filter & Search Toolbar */}
          <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Segmented Status Filter Controls */}
            <div
              role="tablist"
              aria-label="Filter dealers by approval status"
              className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit"
            >
              {(
                [
                  { id: 'pending', label: `Pending (${counts.pending})` },
                  { id: 'approved', label: `Approved (${counts.approved})` },
                  { id: 'rejected', label: `Rejected (${counts.rejected})` },
                  { id: 'all', label: `All (${counts.all})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono tabular-nums ${
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
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search business, GSTIN, contact, city..."
                aria-label="Search dealer applications"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-teal-700"
              />
            </div>
          </div>

          {/* Filtered Empty State */}
          {filteredDealers.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                No dealer records match your active filter
              </p>
              <p className="text-xs text-slate-500">
                Adjust your status tab or clear the search query to inspect other dealer records.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleSelectTab('all');
                  setSearchQuery('');
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Show All Dealers
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th scope="col" className="py-3 pl-6 pr-4 whitespace-nowrap">
                      Business Name
                    </th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">
                      Applicant Details (Review)
                    </th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">
                      GSTIN &amp; Territory
                    </th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">
                      Application Date
                    </th>
                    <th scope="col" className="py-3 px-4 whitespace-nowrap">
                      Approval Status
                    </th>
                    <th scope="col" className="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                      Review Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredDealers.map((dealer) => {
                    const statusMeta = DEALER_APPROVAL_META[dealer.approvalStatus];
                    return (
                      <tr
                        key={dealer.id}
                        onClick={() => setSelectedDealerId(dealer.id)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 pl-6 pr-4">
                          <div className="font-semibold text-slate-900 truncate max-w-[250px]">
                            {dealer.businessName}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 whitespace-nowrap mt-0.5">
                            <span className="font-mono">{dealer.dealerCode}</span>
                            <span aria-hidden="true">·</span>
                            <span>{dealer.businessType}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800 whitespace-nowrap">
                            {dealer.contactPerson}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[220px] mt-0.5">
                            {dealer.approvalStatus === 'approved'
                              ? `${dealer.wholesaleTier} · ${formatInr(dealer.creditLimit)} limit`
                              : dealer.approvalStatus === 'rejected' && dealer.rejectionReason
                                ? `Reason: ${dealer.rejectionReason}`
                                : 'Wholesale Trade Applicant'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                            {dealer.gstin}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{dealer.regionCity}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600 tabular-nums">
                          {formatOrderDate(dealer.applicationDateIso)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          <div className={statusMeta.toneClass}>{statusMeta.label}</div>
                          {dealer.reviewedAtIso && (
                            <div className="font-mono text-[11px] text-slate-500 tabular-nums mt-0.5">
                              {formatOrderDate(dealer.reviewedAtIso)}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDealerId(dealer.id);
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                              dealer.approvalStatus === 'pending'
                                ? 'bg-slate-900 text-white hover:bg-slate-800'
                                : 'text-teal-800 hover:text-teal-950 hover:underline'
                            }`}
                          >
                            {dealer.approvalStatus === 'pending'
                              ? 'Review Application'
                              : 'View Decision'}
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

      {/* Administrative Dealer Review Slide-Over Drawer */}
      {selectedDealer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dealer-review-drawer-title"
        >
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl border-l border-slate-200 flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 flex items-center gap-2 font-mono tabular-nums">
                    <span>{selectedDealer.dealerCode}</span>
                    <span aria-hidden="true">·</span>
                    <span className={DEALER_APPROVAL_META[selectedDealer.approvalStatus].toneClass}>
                      {DEALER_APPROVAL_META[selectedDealer.approvalStatus].label}
                    </span>
                  </div>
                  <h2
                    id="dealer-review-drawer-title"
                    className="mt-1 text-xl font-bold text-slate-900 truncate"
                  >
                    {selectedDealer.businessName}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDealerId(null)}
                  aria-label="Close dealer review panel"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Section 1: Business & Tax Compliance Metadata */}
                <section aria-label="Business Application Summary" className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    01. Business &amp; Compliance Summary
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <dt className="text-slate-500">Applicant Contact Person</dt>
                      <dd className="mt-0.5 font-semibold text-slate-900">
                        {selectedDealer.contactPerson}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Commercial GSTIN</dt>
                      <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                        {selectedDealer.gstin}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Business Classification</dt>
                      <dd className="mt-0.5 font-medium text-slate-800">
                        {selectedDealer.businessType}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Operating Region</dt>
                      <dd className="mt-0.5 font-medium text-slate-800">
                        {selectedDealer.regionCity}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Application Submitted</dt>
                      <dd className="mt-0.5 font-mono text-slate-800 tabular-nums">
                        {formatOrderDate(selectedDealer.applicationDateIso)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Mobile Profile Document Key</dt>
                      <dd className="mt-0.5 font-mono text-slate-700 break-all">
                        /dealers/{selectedDealer.id}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Section 2: Isolated Applicant Review Details (/dealers/{id}/application_details/review) */}
                <section
                  aria-label="Permitted Administrative Review Details"
                  className="pt-5 border-t border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      02. Applicant Verification Dossier
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Isolated Subcollection
                    </span>
                  </div>

                  {isDemoMode ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Direct Contact &amp; Warehouse Dossier Withheld in Demo Mode</span>
                      </div>
                      <p className="leading-relaxed">
                        Applicant trade email, direct telephone, and commercial warehouse street
                        address are stored in{' '}
                        <code className="font-mono">
                          /dealers/{selectedDealer.id}/application_details/review
                        </code>{' '}
                        and require verified administrator sign-in.
                      </p>
                      <button
                        type="button"
                        onClick={onGoogleSignIn}
                        className="font-semibold text-teal-800 hover:underline cursor-pointer"
                      >
                        Sign in as Administrator to view dossier &amp; record decisions
                      </button>
                    </div>
                  ) : reviewLoading ? (
                    <div className="space-y-2 py-2">
                      <div className="h-4 w-56 bg-slate-100 rounded animate-pulse" />
                      <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
                    </div>
                  ) : reviewError ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      Unable to load isolated review dossier: {reviewError}
                    </div>
                  ) : reviewDetails ? (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                      <div>
                        <dt className="text-slate-500">Business Trade Email</dt>
                        <dd className="mt-0.5 font-mono text-slate-900 break-all">
                          {reviewDetails.applicantEmail}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Direct Business Telephone</dt>
                        <dd className="mt-0.5 font-mono text-slate-900 tabular-nums">
                          {reviewDetails.applicantPhone}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-slate-500">Registered Commercial Warehouse</dt>
                        <dd className="mt-0.5 font-medium text-slate-900">
                          {reviewDetails.registeredWarehouse}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Projected Annual Volume</dt>
                        <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                          {formatInr(reviewDetails.annualProjectedVolumeInr)} / yr
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-slate-500">Applicant Trade Summary</dt>
                        <dd className="mt-0.5 text-slate-700 leading-relaxed">
                          {reviewDetails.applicantNotes || 'No supplementary trade notes submitted.'}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-xs text-slate-500">
                      No supplementary application_details/review subdocument stored for this
                      partner record. Core GSTIN and business details above remain verified for
                      review.
                    </p>
                  )}
                </section>

                {/* Section 3: Mobile App Enforcement & Decision Panel */}
                <section
                  aria-label="Administrative Approval Decision"
                  className="pt-5 border-t border-slate-200 space-y-4"
                >
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                    <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-slate-900">Mobile App &amp; Backend Sync:</strong>{' '}
                      Decisions update <code className="font-mono">approvalStatus</code> and server
                      timestamps on <code className="font-mono">/dealers/{selectedDealer.id}</code>.
                      The Califnco Flutter mobile app gates wholesale pricing and bulk cart checkout
                      on <code className="font-mono">approvalStatus == &apos;approved&apos;</code>,
                      enforced on the backend by <code className="font-mono">firestore.rules</code>.
                    </p>
                  </div>

                  {decisionError && (
                    <div
                      role="alert"
                      className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
                    >
                      {decisionError}
                    </div>
                  )}

                  {selectedDealer.approvalStatus === 'pending' ? (
                    isDemoMode ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
                        <span>
                          Approve and Reject actions are disabled in Read-Only Demo Mode.
                        </span>
                        <button
                          type="button"
                          onClick={onGoogleSignIn}
                          className="px-3.5 py-2 font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Sign In to Review
                        </button>
                      </div>
                    ) : isSelfOwnedApplication ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900">
                        <strong>Separation of Duties Enforced:</strong> Your UID matches this
                        applicant&apos;s <code className="font-mono">ownerUid</code>. Self-approval
                        is blocked. Another verified administrator must review this application.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Approval Configuration */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-900">
                            Approve Wholesale Partnership
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label
                                htmlFor="wholesale-tier-select"
                                className="block text-xs font-medium text-slate-700 mb-1"
                              >
                                Assigned Wholesale Tier
                              </label>
                              <select
                                id="wholesale-tier-select"
                                value={selectedTier}
                                onChange={(e) => handleTierPresetChange(e.target.value)}
                                disabled={actionBusy}
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
                              >
                                {WHOLESALE_TIER_PRESETS.map((preset) => (
                                  <option key={preset.tierLabel} value={preset.tierLabel}>
                                    {preset.tierLabel}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="credit-limit-input"
                                className="block text-xs font-medium text-slate-700 mb-1"
                              >
                                Net-30 Credit Limit (INR)
                              </label>
                              <input
                                id="credit-limit-input"
                                type="number"
                                min={VALIDATION_CONSTRAINTS.DEALER_CREDIT_MIN_APPROVED}
                                max={VALIDATION_CONSTRAINTS.DEALER_CREDIT_MAX_APPROVED}
                                step={25000}
                                value={creditLimitInput}
                                onChange={(e) => setCreditLimitInput(Number(e.target.value))}
                                disabled={actionBusy}
                                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-700"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={handleApprove}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {actionBusy ? 'Persisting Decision...' : 'Approve Dealer Application'}
                            </span>
                          </button>
                        </div>

                        {/* Rejection Configuration */}
                        <div className="pt-5 border-t border-slate-200 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <label
                              htmlFor="dealer-rejection-reason"
                              className="text-xs font-bold text-slate-900"
                            >
                              Reject Application (Reason Required)
                            </label>
                            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                              {rejectionReason.trim().length} /{' '}
                              {VALIDATION_CONSTRAINTS.REJECTION_REASON_MAX_LENGTH}
                            </span>
                          </div>

                          <textarea
                            id="dealer-rejection-reason"
                            rows={3}
                            maxLength={VALIDATION_CONSTRAINTS.REJECTION_REASON_MAX_LENGTH}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            disabled={actionBusy}
                            placeholder="Document the specific GSTIN, territory, or warehouse verification reason..."
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600"
                          />

                          <div className="space-y-1.5">
                            <span className="block text-[11px] text-slate-500">
                              Quick compliance templates:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {REJECTION_TEMPLATES.map((tpl, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setRejectionReason(tpl)}
                                  className="px-2.5 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer text-left"
                                >
                                  Template {idx + 1}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={handleReject}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>
                              {actionBusy ? 'Recording Rejection...' : 'Reject Application'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Recorded Decision Audit Summary for Approved / Rejected Dealers */
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
                      <div className="font-bold text-slate-900">
                        Recorded Administrative Decision:{' '}
                        <span
                          className={DEALER_APPROVAL_META[selectedDealer.approvalStatus].toneClass}
                        >
                          {DEALER_APPROVAL_META[selectedDealer.approvalStatus].label}
                        </span>
                      </div>

                      {selectedDealer.approvalStatus === 'approved' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <span className="text-slate-500 block">Wholesale Partner Tier</span>
                            <span className="font-semibold text-slate-900">
                              {selectedDealer.wholesaleTier}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Authorized Net-30 Credit</span>
                            <span className="font-mono font-semibold text-slate-900 tabular-nums">
                              {formatInr(selectedDealer.creditLimit)} (Available:{' '}
                              {formatInr(selectedDealer.availableCredit)})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-slate-500 block">Recorded Rejection Reason</span>
                          <p className="mt-0.5 text-slate-900 font-medium leading-relaxed">
                            {selectedDealer.rejectionReason ||
                              'Rejected prior to reason audit logging.'}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-mono tabular-nums">
                        <span>
                          Decision Timestamp:{' '}
                          {formatOrderDate(
                            selectedDealer.reviewedAtIso || selectedDealer.updatedAtIso || ''
                          )}
                        </span>
                        {selectedDealer.reviewedByUid && (
                          <span>Reviewer UID: {selectedDealer.reviewedByUid}</span>
                        )}
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
                onClick={() => setSelectedDealerId(null)}
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
