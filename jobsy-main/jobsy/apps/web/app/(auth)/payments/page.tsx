"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PayoutSummary {
  balance: number;
  pending: number;
  paid: number;
  currency?: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  arrival_date?: string;
  currency?: string;
}

const PAYOUT_STATUS_STYLES: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
  in_transit: { color: "bg-blue-100 text-blue-800", label: "In Transit" },
  paid: { color: "bg-green-100 text-green-800", label: "Paid" },
  failed: { color: "bg-red-100 text-red-800", label: "Failed" },
  cancelled: { color: "bg-neutral-100 text-neutral-800", label: "Cancelled" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaymentsPage() {
  const [summary, setSummary] = useState<PayoutSummary>({
    balance: 0,
    pending: 0,
    paid: 0,
  });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requesting, setRequesting] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      apiGet<PayoutSummary | { data?: PayoutSummary }>(
        "/api/payments/payouts/summary",
      ).catch(() => null),
      apiGet<Payout[] | { items?: Payout[]; data?: Payout[] }>(
        "/api/payments/payouts",
      ).catch(() => []),
    ])
      .then(([summaryRes, payoutsRes]) => {
        if (summaryRes) {
          const s =
            "data" in summaryRes && summaryRes.data
              ? summaryRes.data
              : (summaryRes as PayoutSummary);
          setSummary(s);
        }
        const items = Array.isArray(payoutsRes)
          ? payoutsRes
          : payoutsRes.items ?? payoutsRes.data ?? [];
        setPayouts(items);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load payments data",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();
    setPayoutError(null);
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      setPayoutError("Please enter a valid amount");
      return;
    }
    if (amount > summary.balance) {
      setPayoutError("Amount exceeds available balance");
      return;
    }
    setRequesting(true);
    try {
      await apiPost("/api/payments/payouts", { amount });
      setPayoutSuccess(true);
      setSummary((prev) => ({
        ...prev,
        balance: prev.balance - amount,
        pending: prev.pending + amount,
      }));
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutSuccess(false);
        setPayoutAmount("");
      }, 2000);
    } catch (err) {
      setPayoutError(
        err instanceof ApiError ? err.detail : "Failed to request payout",
      );
    } finally {
      setRequesting(false);
    }
  }

  function formatCurrency(amount: number): string {
    return `J$${amount.toLocaleString("en-JM", { minimumFractionDigits: 2 })}`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-JM", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getPayoutStatus(status: string) {
    return (
      PAYOUT_STATUS_STYLES[status] ?? {
        color: "bg-neutral-100 text-neutral-800",
        label: status,
      }
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Earnings</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Track your earnings and request payouts
          </p>
        </div>
        <button
          onClick={() => {
            setShowPayoutModal(true);
            setPayoutAmount(String(summary.balance));
            setPayoutError(null);
            setPayoutSuccess(false);
          }}
          disabled={summary.balance <= 0}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          Request Payout
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg border border-error/30 bg-red-50 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Available Balance
          </p>
          <p className="mt-2 text-3xl font-bold text-brand-primary">
            {isLoading ? (
              <span className="inline-block h-8 w-32 animate-pulse rounded bg-neutral-200" />
            ) : (
              formatCurrency(summary.balance)
            )}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Pending
          </p>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {isLoading ? (
              <span className="inline-block h-8 w-32 animate-pulse rounded bg-neutral-200" />
            ) : (
              formatCurrency(summary.pending)
            )}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Total Paid
          </p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {isLoading ? (
              <span className="inline-block h-8 w-32 animate-pulse rounded bg-neutral-200" />
            ) : (
              formatCurrency(summary.paid)
            )}
          </p>
        </div>
      </div>

      {/* Payout history */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">
          Payout History
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 text-5xl">{"\u{1F4B0}"}</div>
            <h3 className="text-lg font-medium text-neutral-900">
              No payouts yet
            </h3>
            <p className="text-sm text-neutral-500">
              Complete bookings and request payouts to see them here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-500">
                    Arrival
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {payouts.map((payout) => {
                  const statusInfo = getPayoutStatus(payout.status);
                  return (
                    <tr key={payout.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-neutral-900">
                        {formatDate(payout.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {payout.arrival_date
                          ? formatDate(payout.arrival_date)
                          : "\u2014"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout request modal */}
      {showPayoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Request payout"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                Request Payout
              </h2>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="rounded-lg p-1.5 transition hover:bg-neutral-100"
                aria-label="Close"
              >
                {"\u2715"}
              </button>
            </div>

            {payoutSuccess ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 text-4xl text-success">
                  {"\u2705"}
                </div>
                <h3 className="text-lg font-medium text-neutral-900">
                  Payout Requested
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Your payout is being processed. Funds will arrive in 2-5
                  business days.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-neutral-100 px-4 py-3">
                  <p className="text-sm text-neutral-500">
                    Available balance:{" "}
                    <span className="font-semibold text-neutral-900">
                      {formatCurrency(summary.balance)}
                    </span>
                  </p>
                </div>

                {payoutError && (
                  <div className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
                    {payoutError}
                  </div>
                )}

                <form
                  onSubmit={handleRequestPayout}
                  className="space-y-4 p-4"
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Payout Amount (J$){" "}
                      <span className="text-error">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={summary.balance}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPayoutModal(false)}
                      className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={requesting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {requesting && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      )}
                      Request Payout
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
