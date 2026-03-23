import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { COLORS } from "@/constants/theme";
import { formatRelativeTime, formatCurrency } from "@/utils/format";

// ── Types ────────────────────────────────────────────────────────────────

interface DashboardStats {
  active_bookings: number;
  pending_bids: number;
  unread_messages: number;
  earnings: number;
  jobs_posted: number;
  completed_jobs: number;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  sent_at: string;
  is_read: boolean;
}

interface VerificationProgress {
  is_verified: boolean;
  progress: number;
}

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  match: "heart",
  message: "chatbubble",
  payment: "card",
  review: "star",
  booking: "calendar",
  system: "information-circle",
};

// ── Main Screen ──────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [verification, setVerification] = useState<VerificationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isProvider =
    user?.activeRole === "provider" || user?.activeRole === "service_provider";

  // ── Fetch data ───────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, notifsRes, verifyRes] = await Promise.allSettled([
        api.get<DashboardStats>("/api/dashboard/stats"),
        api.get<Notification[]>("/api/notifications", { params: { limit: 5 } }),
        api.get<VerificationProgress>("/api/verification/status"),
      ]);

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }
      if (notifsRes.status === "fulfilled") {
        const data = notifsRes.value.data;
        setNotifications(Array.isArray(data) ? data : []);
      }
      if (verifyRes.status === "fulfilled") {
        setVerification(verifyRes.value.data);
      }
    } catch {
      setError("Could not load dashboard. Please try again.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Stat cards config ────────────────────────────────────────────────

  const statCards: {
    label: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onPress?: () => void;
  }[] = [
    {
      label: "Active Bookings",
      value: stats?.active_bookings ?? 0,
      icon: "calendar",
      color: COLORS.info,
      onPress: () => router.push("/(tabs)/bookings"),
    },
    {
      label: "Pending Bids",
      value: stats?.pending_bids ?? 0,
      icon: "pricetag",
      color: COLORS.warning,
      onPress: () => router.push("/(tabs)/jobs"),
    },
    {
      label: "Unread Messages",
      value: stats?.unread_messages ?? 0,
      icon: "chatbubbles",
      color: COLORS.primary,
      onPress: () => router.push("/(tabs)/chat"),
    },
    ...(isProvider
      ? [
          {
            label: "Earnings",
            value: formatCurrency(stats?.earnings ?? 0),
            icon: "wallet" as keyof typeof Ionicons.glyphMap,
            color: COLORS.success,
            onPress: () => router.push("/(tabs)/payments" as never),
          },
        ]
      : [
          {
            label: "Jobs Posted",
            value: stats?.jobs_posted ?? 0,
            icon: "briefcase" as keyof typeof Ionicons.glyphMap,
            color: COLORS.success,
            onPress: () => router.push("/(tabs)/jobs"),
          },
        ]),
  ];

  // ── Quick actions ────────────────────────────────────────────────────

  const quickActions: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      label: "Post Job",
      icon: "add-circle",
      onPress: () => router.push("/(tabs)/jobs"),
    },
    {
      label: "Browse",
      icon: "search",
      onPress: () => router.push("/(tabs)/search"),
    },
    {
      label: "Bookings",
      icon: "calendar",
      onPress: () => router.push("/(tabs)/bookings"),
    },
    {
      label: "Messages",
      icon: "chatbubbles",
      onPress: () => router.push("/(tabs)/chat"),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-gray-500 mt-3">Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Welcome header */}
      <View className="bg-green-700 px-5 pt-14 pb-6 rounded-b-3xl">
        <Text className="text-white/70 text-sm">Welcome back,</Text>
        <Text className="text-white text-2xl font-bold mt-0.5">
          {user?.displayName || "Jobster"} {isProvider ? "🛠" : ""}
        </Text>
        <Text className="text-white/60 text-xs mt-1 capitalize">
          {user?.activeRole || "user"} account
        </Text>
      </View>

      {/* Error */}
      {error && (
        <View className="mx-5 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <Text className="text-red-700 text-sm">{error}</Text>
          <Pressable onPress={fetchDashboard} className="mt-2">
            <Text className="text-red-600 font-semibold text-sm">Tap to retry</Text>
          </Pressable>
        </View>
      )}

      {/* Verification progress (if not verified) */}
      {verification && !verification.is_verified && (
        <Pressable
          onPress={() => router.push("/(tabs)/verify")}
          className="mx-5 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={18} color={COLORS.warning} />
              <Text className="text-sm font-semibold text-gray-900">
                Complete Verification
              </Text>
            </View>
            <Text className="text-sm font-bold" style={{ color: COLORS.warning }}>
              {verification.progress}%
            </Text>
          </View>
          <View className="h-2.5 bg-white/60 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                width: `${verification.progress}%`,
                backgroundColor:
                  verification.progress >= 60 ? COLORS.warning : COLORS.error,
              }}
            />
          </View>
          <Text className="text-xs text-gray-600 mt-2">
            Verify your account to unlock all features
          </Text>
        </Pressable>
      )}

      {/* Stats cards */}
      <View className="px-5 mt-4">
        <View className="flex-row flex-wrap gap-3">
          {statCards.map((card) => (
            <Pressable
              key={card.label}
              onPress={card.onPress}
              className="bg-white rounded-xl border border-gray-200 p-4 flex-1"
              style={{ minWidth: "45%" }}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mb-3"
                style={{ backgroundColor: card.color + "15" }}
              >
                <Ionicons name={card.icon} size={22} color={card.color} />
              </View>
              <Text className="text-2xl font-bold text-gray-900">{card.value}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{card.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Quick actions */}
      <View className="px-5 mt-6">
        <Text className="text-base font-semibold text-gray-900 mb-3">
          Quick Actions
        </Text>
        <View className="flex-row gap-3">
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              className="flex-1 bg-white rounded-xl border border-gray-200 py-4 items-center"
            >
              <View className="w-11 h-11 rounded-full bg-green-50 items-center justify-center mb-2">
                <Ionicons name={action.icon} size={22} color={COLORS.primary} />
              </View>
              <Text className="text-xs font-medium text-gray-700">
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Recent activity */}
      <View className="px-5 mt-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-semibold text-gray-900">
            Recent Activity
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/notifications")}>
            <Text className="text-sm text-green-700 font-medium">View all</Text>
          </Pressable>
        </View>

        {notifications.length > 0 ? (
          <View className="gap-2">
            {notifications.map((notif) => {
              const icon =
                NOTIFICATION_ICONS[notif.type] || "notifications";
              return (
                <View
                  key={notif.id}
                  className={`flex-row items-start rounded-xl p-3.5 ${
                    notif.is_read ? "bg-white" : "bg-green-50"
                  } border border-gray-100`}
                >
                  <View className="w-9 h-9 rounded-full bg-green-100 items-center justify-center">
                    <Ionicons name={icon} size={18} color={COLORS.primary} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-semibold text-gray-800">
                      {notif.title}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>
                      {notif.body}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(notif.sent_at)}
                    </Text>
                  </View>
                  {!notif.is_read && (
                    <View className="mt-1 w-2 h-2 rounded-full bg-green-500" />
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View className="bg-white rounded-xl border border-gray-200 p-8 items-center">
            <Ionicons name="notifications-outline" size={40} color={COLORS.gray[400]} />
            <Text className="text-sm text-gray-500 mt-2">No recent activity</Text>
          </View>
        )}
      </View>

      {/* Role-specific section */}
      <View className="px-5 mt-6">
        <Text className="text-base font-semibold text-gray-900 mb-3">
          {isProvider ? "Your Earnings Summary" : "Your Posted Jobs"}
        </Text>
        <View className="bg-white rounded-xl border border-gray-200 p-4">
          {isProvider ? (
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-gray-500">Total Earned</Text>
                <Text className="text-xl font-bold text-gray-900 mt-0.5">
                  {formatCurrency(stats?.earnings ?? 0)}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-500">Completed Jobs</Text>
                <Text className="text-xl font-bold text-gray-900 mt-0.5">
                  {stats?.completed_jobs ?? 0}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/(tabs)/payments" as never)}
                className="bg-green-50 px-4 py-2.5 rounded-xl"
              >
                <Text className="text-green-700 font-semibold text-sm">
                  Details
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-gray-500">Jobs Posted</Text>
                <Text className="text-xl font-bold text-gray-900 mt-0.5">
                  {stats?.jobs_posted ?? 0}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-gray-500">Active Bookings</Text>
                <Text className="text-xl font-bold text-gray-900 mt-0.5">
                  {stats?.active_bookings ?? 0}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/(tabs)/jobs")}
                className="bg-green-50 px-4 py-2.5 rounded-xl"
              >
                <Text className="text-green-700 font-semibold text-sm">
                  View Jobs
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
