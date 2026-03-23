"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost, apiPut, ApiError } from "@/lib/api";
import { generateICS, downloadICS } from "@/lib/calendar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = "all" | "active" | "completed" | "cancelled";

interface Booking {
  id: string;
  provider_id: string;
  provider_name?: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: string;
  notes?: string;
  address?: string;
  amount?: number;
}

interface BookingStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
}

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
  confirmed: { color: "bg-blue-100 text-blue-800", label: "Confirmed" },
  active: { color: "bg-green-100 text-green-800", label: "Active" },
  in_progress: { color: "bg-blue-100 text-blue-800", label: "In Progress" },
  completed: { color: "bg-neutral-100 text-neutral-800", label: "Completed" },
  cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
};

function getStatusInfo(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.pending;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const providerIdFromUrl = searchParams.get("provider_id");

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    provider_id: providerIdFromUrl ?? "",
    service_type: "",
    scheduled_date: "",
    scheduled_time: "",
    notes: "",
    address: "",
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(
    null,
  );
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Refund state
  const [refundBooking, setRefundBooking] = useState<Booking | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState(false);

  // Auto-open create modal if provider_id in URL
  useEffect(() => {
    if (providerIdFromUrl) {
      setFormData((prev) => ({ ...prev, provider_id: providerIdFromUrl }));
      setShowCreateModal(true);
    }
  }, [providerIdFromUrl]);

  // Fetch bookings
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      apiGet<Booking[]>("/api/bookings").catch(() => []),
      apiGet<BookingStats>("/api/bookings/stats").catch(() => null),
    ]).then(([bookingsData, statsData]) => {
      const items = Array.isArray(bookingsData) ? bookingsData : [];
      setBookings(items);
      setStats(
        statsData ?? {
          total: items.length,
          active: items.filter((b) =>
            ["pending", "confirmed", "active", "in_progress"].includes(
              b.status,
            ),
          ).length,
          completed: items.filter((b) => b.status === "completed").length,
          cancelled: items.filter((b) => b.status === "cancelled").length,
        },
      );
      setIsLoading(false);
    });
  }, []);

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "active")
      return ["pending", "confirmed", "active", "in_progress"].includes(
        b.status,
      );
    return b.status === activeTab;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (
      !formData.provider_id ||
      !formData.service_type ||
      !formData.scheduled_date
    ) {
      setFormError("Please fill in required fields");
      return;
    }
    setCreating(true);
    try {
      await apiPost("/api/bookings/", formData);
      setShowCreateModal(false);
      const refreshed = await apiGet<Booking[]>("/api/bookings").catch(
        () => [],
      );
      setBookings(Array.isArray(refreshed) ? refreshed : []);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.detail : "Failed to create booking",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleCancel(bookingId: string) {
    try {
      await apiPut(`/api/bookings/${bookingId}/status`, {
        status: "cancelled",
      });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: "cancelled" } : b,
        ),
      );
    } catch {
      // silently fail
    }
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!rescheduleBooking || !rescheduleDate) return;
    setRescheduleError(null);
    setRescheduling(true);
    try {
      await apiPost(`/api/bookings/${rescheduleBooking.id}/reschedule`, {
        scheduled_date: rescheduleDate,
        scheduled_time: rescheduleTime || undefined,
      });
      setBookings((prev) =>
        prev.map((b) =>
          b.id === rescheduleBooking.id
            ? {
                ...b,
                scheduled_date: rescheduleDate,
                scheduled_time: rescheduleTime || b.scheduled_time,
              }
            : b,
        ),
      );
      setRescheduleBooking(null);
      setRescheduleDate("");
      setRescheduleTime("");
    } catch (err) {
      setRescheduleError(
        err instanceof ApiError ? err.detail : "Failed to reschedule booking",
      );
    } finally {
      setRescheduling(false);
    }
  }

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!refundBooking) return;
    setRefundError(null);
    setRefunding(true);
    try {
      const amount =
        refundType === "full"
          ? refundBooking.amount ?? 0
          : parseFloat(refundAmount);
      if (refundType === "partial" && (!amount || amount <= 0)) {
        setRefundError("Please enter a valid refund amount");
        setRefunding(false);
        return;
      }
      await apiPost("/api/payments/refunds", {
        booking_id: refundBooking.id,
        amount,
        reason: refundReason || undefined,
        type: refundType,
      });
      setRefundSuccess(true);
      setTimeout(() => {
        setRefundBooking(null);
        setRefundSuccess(false);
        setRefundAmount("");
        setRefundReason("");
        setRefundType("full");
      }, 2000);
    } catch (err) {
      setRefundError(
        err instanceof ApiError ? err.detail : "Failed to request refund",
      );
    } finally {
      setRefunding(false);
    }
  }

  function handleAddToCalendar(booking: Booking) {
    const ics = generateICS({
      title: `Jobsy: ${booking.service_type}`,
      description: `Booking with ${booking.provider_name ?? "Provider"}${booking.notes ? `\nNotes: ${booking.notes}` : ""}`,
      location: booking.address,
      startDate: booking.scheduled_date,
      startTime: booking.scheduled_time,
    });
    downloadICS(ics, `jobsy-booking-${booking.id}.ics`);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Bookings</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your service bookings
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          + Create Booking
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "bg-blue-100" },
          { label: "Active", value: stats.active, color: "bg-green-100" },
          {
            label: "Completed",
            value: stats.completed,
            color: "bg-neutral-100",
          },
          { label: "Cancelled", value: stats.cancelled, color: "bg-red-100" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-neutral-200 bg-white p-4"
          >
            <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
            <p className="text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <div className="flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 text-5xl">{"\u{1F4C5}"}</div>
          <h3 className="text-lg font-medium text-neutral-900">
            No bookings found
          </h3>
          <p className="text-sm text-neutral-500">
            {activeTab === "all"
              ? "Create your first booking to get started."
              : `No ${activeTab} bookings.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const statusInfo = getStatusInfo(booking.status);
            const isActionable = [
              "pending",
              "confirmed",
              "active",
              "in_progress",
            ].includes(booking.status);
            const isCompleted = booking.status === "completed";

            return (
              <div
                key={booking.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 transition hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900">
                      {booking.provider_name ??
                        `Provider ${booking.provider_id}`}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {booking.service_type}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                      <span>{booking.scheduled_date}</span>
                      {booking.scheduled_time && (
                        <span>{booking.scheduled_time}</span>
                      )}
                      {booking.address && <span>{booking.address}</span>}
                    </div>
                    {booking.notes && (
                      <p className="mt-1 truncate text-xs text-neutral-400">
                        Note: {booking.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>

                    {/* Add to Calendar */}
                    <button
                      onClick={() => handleAddToCalendar(booking)}
                      className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:border-brand-primary hover:text-brand-primary"
                      title="Add to calendar"
                      aria-label="Add to calendar"
                    >
                      <svg
                        className="inline h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>{" "}
                      Calendar
                    </button>

                    {/* Reschedule */}
                    {isActionable && (
                      <button
                        onClick={() => {
                          setRescheduleBooking(booking);
                          setRescheduleDate(booking.scheduled_date);
                          setRescheduleTime(booking.scheduled_time ?? "");
                        }}
                        className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:border-brand-primary hover:text-brand-primary"
                        title="Reschedule booking"
                        aria-label="Reschedule booking"
                      >
                        Reschedule
                      </button>
                    )}

                    {/* Refund */}
                    {isCompleted && (
                      <button
                        onClick={() => {
                          setRefundBooking(booking);
                          setRefundAmount(
                            booking.amount ? String(booking.amount) : "",
                          );
                          setRefundType("full");
                          setRefundReason("");
                          setRefundError(null);
                          setRefundSuccess(false);
                        }}
                        className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:border-error hover:text-error"
                        title="Request refund"
                        aria-label="Request refund"
                      >
                        Refund
                      </button>
                    )}

                    {/* Cancel */}
                    {isActionable && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="rounded-lg p-1.5 text-error transition hover:bg-red-50"
                        title="Cancel booking"
                        aria-label="Cancel booking"
                      >
                        {"\u2715"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Create booking"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                Create Booking
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 transition hover:bg-neutral-100"
                aria-label="Close"
              >
                {"\u2715"}
              </button>
            </div>

            {formError && (
              <div className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Provider ID <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={formData.provider_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      provider_id: e.target.value,
                    }))
                  }
                  placeholder="Enter provider ID"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  required
                />
                {providerIdFromUrl && (
                  <p className="mt-1 text-xs text-success">
                    Pre-filled from provider profile
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Service Type <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={formData.service_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      service_type: e.target.value,
                    }))
                  }
                  placeholder="e.g. Plumbing, Cleaning, Electrical"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduled_date: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduled_time: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Service address"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Any additional details..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reschedule booking"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                Reschedule Booking
              </h2>
              <button
                onClick={() => setRescheduleBooking(null)}
                className="rounded-lg p-1.5 transition hover:bg-neutral-100"
                aria-label="Close"
              >
                {"\u2715"}
              </button>
            </div>

            <div className="border-b border-neutral-100 px-4 py-3">
              <p className="text-sm font-medium text-neutral-900">
                {rescheduleBooking.service_type}
              </p>
              <p className="text-xs text-neutral-500">
                with{" "}
                {rescheduleBooking.provider_name ??
                  `Provider ${rescheduleBooking.provider_id}`}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Currently: {rescheduleBooking.scheduled_date}
                {rescheduleBooking.scheduled_time &&
                  ` at ${rescheduleBooking.scheduled_time}`}
              </p>
            </div>

            {rescheduleError && (
              <div className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleReschedule} className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    New Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    New Time
                  </label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {rescheduling && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund modal */}
      {refundBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Request refund"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4">
              <h2 className="text-lg font-semibold text-neutral-900">
                Request Refund
              </h2>
              <button
                onClick={() => setRefundBooking(null)}
                className="rounded-lg p-1.5 transition hover:bg-neutral-100"
                aria-label="Close"
              >
                {"\u2715"}
              </button>
            </div>

            {refundSuccess ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 text-4xl text-success">
                  {"\u2705"}
                </div>
                <h3 className="text-lg font-medium text-neutral-900">
                  Refund Requested
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Your refund request has been submitted and is being processed.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-neutral-100 px-4 py-3">
                  <p className="text-sm font-medium text-neutral-900">
                    {refundBooking.service_type}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Booking #{refundBooking.id.slice(0, 8)}
                  </p>
                  {refundBooking.amount != null && (
                    <p className="mt-1 text-sm font-semibold text-neutral-900">
                      Amount paid: J$
                      {refundBooking.amount.toLocaleString()}
                    </p>
                  )}
                </div>

                {refundError && (
                  <div className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-error">
                    {refundError}
                  </div>
                )}

                <form onSubmit={handleRefund} className="space-y-4 p-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-neutral-700">
                      Refund Type
                    </label>
                    <div className="flex gap-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="refundType"
                          checked={refundType === "full"}
                          onChange={() => setRefundType("full")}
                          className="text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="text-sm text-neutral-700">
                          Full Refund
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="refundType"
                          checked={refundType === "partial"}
                          onChange={() => setRefundType("partial")}
                          className="text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="text-sm text-neutral-700">
                          Partial Refund
                        </span>
                      </label>
                    </div>
                  </div>

                  {refundType === "partial" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700">
                        Refund Amount (J$){" "}
                        <span className="text-error">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={refundBooking.amount ?? undefined}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Reason
                    </label>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Why are you requesting a refund?"
                      rows={3}
                      className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRefundBooking(null)}
                      className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={refunding}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {refunding && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      )}
                      Request Refund
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
