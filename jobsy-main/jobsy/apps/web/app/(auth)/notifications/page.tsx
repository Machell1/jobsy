"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet, apiPatch, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType =
  | "booking"
  | "message"
  | "review"
  | "payment"
  | "system"
  | "promotion";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  booking: "\u{1F4C5}",
  message: "\u{1F4AC}",
  review: "\u{2B50}",
  payment: "\u{1F4B0}",
  system: "\u{2699}\uFE0F",
  promotion: "\u{1F389}",
};

const TYPE_COLORS: Record<NotificationType, string> = {
  booking: "bg-blue-100",
  message: "bg-green-100",
  review: "bg-yellow-100",
  payment: "bg-purple-100",
  system: "bg-neutral-100",
  promotion: "bg-pink-100",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    apiGet<
      | Notification[]
      | { items?: Notification[]; data?: Notification[]; notifications?: Notification[] }
    >("/api/notifications")
      .then((res) => {
        const items = Array.isArray(res)
          ? res
          : res.items ?? res.data ?? res.notifications ?? [];
        setNotifications(items);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load notifications",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function markAsRead(id: string) {
    try {
      await apiPatch(`/api/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch {
      // silently fail
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    try {
      // Attempt batch mark-all endpoint, fall back to individual
      await apiPatch("/api/notifications/read-all", {});
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true })),
      );
    } catch {
      // Fall back: mark each unread individually
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.allSettled(
        unread.map((n) => apiPatch(`/api/notifications/${n.id}/read`, {})),
      );
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true })),
      );
    } finally {
      setMarkingAll(false);
    }
  }

  const filtered =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString("en-JM", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Stay updated on your bookings, messages, and more
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings/notifications"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Preferences
          </Link>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {markingAll ? "Marking..." : "Mark all read"}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === "all"
              ? "bg-brand-primary text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === "unread"
              ? "bg-brand-primary text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          Unread ({unreadCount})
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
        </div>
      )}

      {/* Notification list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const icon = TYPE_ICONS[notif.type] ?? TYPE_ICONS.system;
            const bgColor = TYPE_COLORS[notif.type] ?? TYPE_COLORS.system;

            const content = (
              <div
                className={`flex gap-3 rounded-xl border p-4 transition ${
                  notif.is_read
                    ? "border-neutral-200 bg-white"
                    : "border-brand-primary/20 bg-brand-primary/5"
                } hover:shadow-sm`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${bgColor}`}
                >
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm ${
                        notif.is_read
                          ? "font-normal text-neutral-700"
                          : "font-medium text-neutral-900"
                      }`}
                    >
                      {notif.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-neutral-400">
                      {formatDate(notif.created_at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {notif.body}
                  </p>
                </div>
                {!notif.is_read && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markAsRead(notif.id);
                    }}
                    className="shrink-0 self-center rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-brand-primary"
                    title="Mark as read"
                    aria-label="Mark as read"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                )}
              </div>
            );

            return notif.action_url ? (
              <Link
                key={notif.id}
                href={notif.action_url}
                onClick={() => {
                  if (!notif.is_read) markAsRead(notif.id);
                }}
                className="block"
              >
                {content}
              </Link>
            ) : (
              <div key={notif.id}>{content}</div>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 text-5xl">{"\u{1F514}"}</div>
          <h3 className="text-lg font-medium text-neutral-900">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            {filter === "unread"
              ? "You're all caught up!"
              : "Notifications about bookings, messages, and payments will appear here."}
          </p>
        </div>
      )}
    </main>
  );
}
