"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet, apiPut, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelPreferences {
  email: boolean;
  push: boolean;
  in_app: boolean;
}

interface NotificationPreferences {
  bookings: ChannelPreferences;
  messages: ChannelPreferences;
  reviews: ChannelPreferences;
  payments: ChannelPreferences;
  promotions: ChannelPreferences;
  system: ChannelPreferences;
}

type Category = keyof NotificationPreferences;
type Channel = keyof ChannelPreferences;

const CATEGORIES: { key: Category; label: string; description: string }[] = [
  {
    key: "bookings",
    label: "Bookings",
    description: "New bookings, confirmations, cancellations, and reminders",
  },
  {
    key: "messages",
    label: "Messages",
    description: "New messages and conversation updates",
  },
  {
    key: "reviews",
    label: "Reviews",
    description: "New reviews and review responses",
  },
  {
    key: "payments",
    label: "Payments",
    description: "Payment confirmations, refunds, and payout updates",
  },
  {
    key: "promotions",
    label: "Promotions",
    description: "Special offers, tips, and platform updates",
  },
  {
    key: "system",
    label: "System",
    description: "Account security, policy changes, and maintenance alerts",
  },
];

const CHANNELS: { key: Channel; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "push", label: "Push" },
  { key: "in_app", label: "In-App" },
];

const DEFAULT_PREFS: NotificationPreferences = {
  bookings: { email: true, push: true, in_app: true },
  messages: { email: false, push: true, in_app: true },
  reviews: { email: true, push: true, in_app: true },
  payments: { email: true, push: true, in_app: true },
  promotions: { email: false, push: false, in_app: true },
  system: { email: true, push: true, in_app: true },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    apiGet<
      NotificationPreferences | { data?: NotificationPreferences }
    >("/api/notifications/preferences")
      .then((res) => {
        const data = "data" in res && res.data ? res.data : (res as NotificationPreferences);
        setPrefs(data);
      })
      .catch(() => {
        // Use defaults if API fails
      })
      .finally(() => setIsLoading(false));
  }, []);

  function togglePref(category: Category, channel: Channel) {
    setPrefs((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: !prev[category][channel],
      },
    }));
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await apiPut("/api/notifications/preferences", prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Failed to save preferences",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="text-sm text-neutral-500 hover:text-brand-primary"
              aria-label="Back to notifications"
            >
              &larr; Notifications
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-neutral-900">
            Notification Preferences
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Choose how you want to be notified for each type of event
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {saving && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {saved ? "Saved!" : "Save Preferences"}
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
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-5 py-3 text-left font-medium text-neutral-500">
                  Category
                </th>
                {CHANNELS.map((ch) => (
                  <th
                    key={ch.key}
                    className="px-5 py-3 text-center font-medium text-neutral-500"
                  >
                    {ch.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {CATEGORIES.map((cat) => (
                <tr key={cat.key} className="hover:bg-neutral-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-neutral-900">{cat.label}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {cat.description}
                    </p>
                  </td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.key} className="px-5 py-4 text-center">
                      <label className="inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prefs[cat.key][ch.key]}
                          onChange={() => togglePref(cat.key, ch.key)}
                          className="h-4 w-4 rounded border-neutral-300 text-brand-primary focus:ring-brand-primary"
                          aria-label={`${ch.label} notifications for ${cat.label}`}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <h3 className="text-sm font-medium text-neutral-700">
          About notification channels
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-neutral-500">
          <li>
            <strong>Email</strong> &mdash; Sent to your registered email
            address.
          </li>
          <li>
            <strong>Push</strong> &mdash; Mobile and desktop push notifications
            (requires the Jobsy app).
          </li>
          <li>
            <strong>In-App</strong> &mdash; Shown in the notification centre
            within the app.
          </li>
        </ul>
      </div>
    </main>
  );
}
