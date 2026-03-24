"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet, ApiError } from "@/lib/api";
import { Briefcase, CalendarCheck, MessageCircle, Heart, Search } from "lucide-react";
import { DashboardGreeting } from "../../../app/components/DashboardGreeting";
import { ProfileStrengthBar } from "../../../app/components/ProfileStrengthBar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  total_bookings?: number;
  completed_bookings?: number;
  pending_bookings?: number;
  cancelled_bookings?: number;
  average_rating?: number;
  total_reviews?: number;
  total_earnings?: number;
  posted_jobs?: number;
  active_bids_received?: number;
  active_contracts?: number;
  available_jobs?: number;
  my_bids?: number;
  earnings_this_month?: number;
  active_campaigns?: number;
  total_impressions?: number;
  total_clicks?: number;
  ctr?: number;
  total_spend?: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  customer: "Hirer",
  hirer: "Hirer",
  provider: "Provider",
  advertiser: "Advertiser",
};

const ROLE_COLORS: Record<string, string> = {
  customer: "bg-blue-100 text-blue-700",
  hirer: "bg-blue-100 text-blue-700",
  provider: "bg-green-100 text-green-700",
  advertiser: "bg-purple-100 text-purple-700",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [currentRole, setCurrentRole] = useState("customer");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    // Read role from session
    if (typeof window !== "undefined") {
      const savedRole = sessionStorage.getItem("jobsy_role");
      if (savedRole) setCurrentRole(savedRole);
    }
  }, []);

  useEffect(() => {
    setStatsLoading(true);
    setStatsError(null);

    Promise.all([
      apiGet<DashboardStats>(
        `/api/analytics/dashboard?role=${currentRole}`,
      ).catch(() => null),
      apiGet<ActivityItem[]>(
        `/api/analytics/activity?role=${currentRole}&limit=5`,
      ).catch(() => []),
    ])
      .then(([statsData, activityData]) => {
        setStats(statsData);
        setActivity(activityData ?? []);
      })
      .catch(() => {
        setStatsError("Unable to load dashboard stats");
      })
      .finally(() => setStatsLoading(false));
  }, [currentRole]);

  const isHirer = currentRole === "hirer" || currentRole === "customer";
  const isProvider = currentRole === "provider";
  const isAdvertiser = currentRole === "advertiser";

  function getStatCards() {
    if (!stats) return [];
    if (isHirer) {
      return [
        { label: "Posted Jobs", value: stats.posted_jobs ?? stats.total_bookings ?? 0 },
        { label: "Bids Received", value: stats.active_bids_received ?? 0 },
        { label: "Active Contracts", value: stats.active_contracts ?? 0 },
        { label: "Pending Bookings", value: stats.pending_bookings ?? 0 },
      ];
    }
    if (isProvider) {
      return [
        { label: "Available Jobs", value: stats.available_jobs ?? 0 },
        { label: "My Bids", value: stats.my_bids ?? 0 },
        { label: "Active Contracts", value: stats.active_contracts ?? stats.total_bookings ?? 0 },
        { label: "Earnings (Month)", value: `J$${(stats.earnings_this_month ?? 0).toLocaleString()}` },
        { label: "Avg Rating", value: stats.average_rating?.toFixed(1) ?? "--" },
      ];
    }
    return [
      { label: "Active Campaigns", value: stats.active_campaigns ?? 0 },
      { label: "Impressions", value: (stats.total_impressions ?? 0).toLocaleString() },
      { label: "Clicks", value: (stats.total_clicks ?? 0).toLocaleString() },
      { label: "CTR", value: `${(stats.ctr ?? 0).toFixed(2)}%` },
      { label: "Total Spend", value: `J$${(stats.total_spend ?? 0).toLocaleString()}` },
    ];
  }

  const statCards = getStatCards();

  const quickActions = isHirer
    ? [
        { href: "/search", label: "Post a Job", description: "Find service providers", icon: Briefcase },
        { href: "/bookings", label: "My Bookings", description: "Manage your bookings", icon: CalendarCheck },
        { href: "/messages", label: "Messages (3)", description: "Check messages", icon: MessageCircle, badge: 3 },
        { href: "/search/saved", label: "Saved Providers", description: "Your favorites", icon: Heart },
      ]
    : isProvider
      ? [
          { href: "/search", label: "Browse Jobs", description: "Find available work", icon: Search },
          { href: "/bookings", label: "View Earnings", description: "Track your income", icon: CalendarCheck },
          { href: "/messages", label: "Messages", description: "Check messages", icon: MessageCircle },
        ]
      : [
          { href: "/messages", label: "Messages", description: "Check messages", icon: MessageCircle },
        ];

  const profileItems = [
    { label: "Add a profile photo", done: true },
    { label: "Verify your email", done: true },
    { label: "Add your parish", done: true },
    { label: "Complete your bio", done: false },
    { label: "Add a payment method", done: false },
  ];

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-JM", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Personalized Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <DashboardGreeting />
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[var(--color-neutral-400)]">
            Viewing as{" "}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                ROLE_COLORS[currentRole] ?? "bg-neutral-100 text-neutral-700"
              }`}
            >
              {ROLE_LABELS[currentRole] ?? currentRole}
            </span>
          </p>
        </div>

        {/* Role switcher */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-neutral-400)]">Switch:</span>
          {["customer", "provider", "advertiser"].map((role) => (
            <button
              key={role}
              onClick={() => {
                setCurrentRole(role);
                sessionStorage.setItem("jobsy_role", role);
              }}
              disabled={role === currentRole}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                role === currentRole
                  ? "bg-[var(--color-navy)] text-white shadow-sm"
                  : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-200)]"
              } disabled:opacity-50`}
            >
              {ROLE_LABELS[role] ?? role}
            </button>
          ))}
        </div>
      </div>

      {/* Live Activity */}
      <div className="flex items-center gap-2 rounded-[14px] border border-[var(--color-neutral-200)] bg-white px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm text-[var(--color-neutral-400)]">
          23 bookings completed today in Jamaica
        </span>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-neutral-800)]">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Link
                key={action.href + action.label}
                href={action.href}
                className="btn-press group relative flex flex-col items-center gap-3 rounded-[14px] border border-[var(--color-neutral-200)] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--color-navy)]/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-navy-subtle)]">
                  <ActionIcon className="h-5 w-5 text-[var(--color-navy)]" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-[var(--color-neutral-800)]">
                  {action.label}
                </span>
                {"badge" in action && action.badge ? (
                  <span className="badge-pop absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-error)] px-1.5 text-[10px] font-bold text-white">
                    {action.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-neutral-800">
          {isHirer
            ? "Hiring Overview"
            : isProvider
              ? "Provider Stats"
              : "Campaign Overview"}
        </h2>

        {statsLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-white py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
            <span className="ml-2 text-neutral-500">Loading stats...</span>
          </div>
        ) : statsError ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <p className="text-sm text-neutral-600">{statsError}</p>
            <p className="mt-1 text-xs text-neutral-400">
              Try again later.
            </p>
          </div>
        ) : (
          <div
            className={`grid grid-cols-2 gap-4 sm:grid-cols-3 ${
              statCards.length <= 4 ? "lg:grid-cols-4" : "lg:grid-cols-5"
            }`}
          >
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-neutral-200 bg-white p-4"
              >
                <p className="mb-2 truncate text-xs text-neutral-500">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-neutral-900">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-neutral-800">
          Recent Activity
        </h2>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {activity.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {item.description}
                    </p>
                  </div>
                  <span className="ml-2 shrink-0 text-xs text-neutral-400">
                    {formatDate(item.created_at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-500">
                No recent activity yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Continue Where You Left Off + Profile Strength */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Continue where you left off */}
        <div className="rounded-[14px] border border-[var(--color-neutral-200)] bg-white p-6">
          <h3 className="mb-4 font-semibold text-[var(--color-neutral-950)]">Continue where you left off</h3>
          <div className="space-y-3">
            {["Sparkle Clean JA", "PowerFix Solutions", "GreenThumb Jamaica"].map((name) => (
              <Link
                key={name}
                href="/search"
                className="flex items-center gap-3 rounded-[10px] border border-[var(--color-neutral-100)] p-3 transition-colors hover:bg-[var(--color-neutral-50)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-navy-subtle)] text-sm font-bold text-[var(--color-navy)]">
                  {name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-neutral-950)]">{name}</p>
                  <p className="text-xs text-[var(--color-neutral-400)]">Viewed recently</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Profile Strength */}
        <ProfileStrengthBar items={profileItems} />
      </div>

      {/* Role-specific CTA */}
      {isHirer && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Looking for providers?
            </p>
            <p className="mt-0.5 text-xs text-blue-700">
              Browse to find and hire skilled professionals.
            </p>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Browse &rarr;
          </Link>
        </div>
      )}
    </main>
  );
}
