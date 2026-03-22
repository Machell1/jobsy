import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { COLORS } from "@/constants/theme";

// ── Types ────────────────────────────────────────────────────────────────

interface DashboardStats {
  total_rsvps: number;
  tickets_sold: number;
  revenue: number;
  views: number;
  check_ins: number;
  capacity: number;
}

interface RevenueBreakdown {
  label: string;
  amount: number;
}

interface Attendee {
  id: string;
  display_name: string;
  avatar_url: string | null;
  rsvp_status: "confirmed" | "pending" | "declined" | "checked_in";
  ticket_type: string;
  rsvp_date: string;
}

interface EventDashboardData {
  event_id: string;
  event_title: string;
  event_date: string;
  status: "draft" | "published" | "cancelled" | "completed";
  stats: DashboardStats;
  revenue_breakdown: RevenueBreakdown[];
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `J$${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function rsvpStatusColor(status: Attendee["rsvp_status"]): string {
  switch (status) {
    case "confirmed":
      return COLORS.success;
    case "pending":
      return COLORS.warning;
    case "declined":
      return COLORS.error;
    case "checked_in":
      return COLORS.info;
    default:
      return COLORS.gray[500];
  }
}

function rsvpStatusLabel(status: Attendee["rsvp_status"]): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Pending";
    case "declined":
      return "Declined";
    case "checked_in":
      return "Checked In";
    default:
      return status;
  }
}

// ── Main Screen ──────────────────────────────────────────────────────────

export default function EventDashboardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [dashboard, setDashboard] = useState<EventDashboardData | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Announcement modal
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // Cancel/reschedule
  const [cancelling, setCancelling] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"overview" | "attendees">("overview");

  // ── Data Fetching ────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [dashRes, attendeesRes] = await Promise.all([
        api.get<EventDashboardData>(`/api/events/${id}/dashboard`),
        api.get<Attendee[]>(`/api/events/${id}/attendees`),
      ]);
      setDashboard(dashRes.data);
      setAttendees(attendeesRes.data);
    } catch {
      setError("Failed to load event dashboard. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  // Fetch on mount
  useEffect(() => {
    fetchDashboard();
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────

  const handleSendAnnouncement = async () => {
    if (!announcementText.trim() || !id) return;
    setSendingAnnouncement(true);
    try {
      await api.post(`/api/events/${id}/announcements`, {
        message: announcementText.trim(),
      });
      setAnnouncementText("");
      setShowAnnouncementModal(false);
      Alert.alert("Sent", "Your announcement has been sent to all attendees.");
    } catch {
      Alert.alert("Error", "Failed to send announcement. Please try again.");
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleCancelEvent = () => {
    Alert.alert(
      "Cancel Event",
      "Are you sure you want to cancel this event? All attendees will be notified and ticket holders will be refunded.",
      [
        { text: "Keep Event", style: "cancel" },
        {
          text: "Cancel Event",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await api.post(`/api/events/${id}/cancel`);
              Alert.alert("Cancelled", "The event has been cancelled.");
              fetchDashboard();
            } catch {
              Alert.alert("Error", "Failed to cancel event.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleReschedule = () => {
    Alert.alert(
      "Reschedule Event",
      "This will open the event editor where you can change the date and time. All attendees will be notified of the change.",
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "Edit Event",
          onPress: () => router.push(`/(tabs)/events/create?edit=${id}`),
        },
      ]
    );
  };

  // ── Render: Loading / Error ──────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Stack.Screen options={{ headerTitle: "Event Dashboard" }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-gray-500 mt-3">Loading dashboard...</Text>
      </View>
    );
  }

  if (error || !dashboard) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <Stack.Screen options={{ headerTitle: "Event Dashboard" }} />
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.gray[400]} />
        <Text className="mt-4 text-lg font-semibold text-gray-700">
          {error || "Dashboard not available"}
        </Text>
        <Pressable
          onPress={fetchDashboard}
          className="mt-4 px-6 py-3 rounded-xl"
          style={{ backgroundColor: COLORS.primary }}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const stats = dashboard.stats;
  const maxRevenue = Math.max(
    ...dashboard.revenue_breakdown.map((r) => r.amount),
    1
  );

  // ── Render: Stats Cards ──────────────────────────────────────────────

  const statCards: {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
  }[] = [
    {
      label: "RSVPs",
      value: stats.total_rsvps.toLocaleString(),
      icon: "people",
      color: COLORS.info,
    },
    {
      label: "Tickets Sold",
      value: stats.tickets_sold.toLocaleString(),
      icon: "ticket",
      color: COLORS.success,
    },
    {
      label: "Revenue",
      value: formatCurrency(stats.revenue),
      icon: "cash",
      color: COLORS.primary,
    },
    {
      label: "Views",
      value: stats.views.toLocaleString(),
      icon: "eye",
      color: COLORS.warning,
    },
  ];

  // ── Render: Main ─────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerTitle: "Event Dashboard",
          headerTitleStyle: { fontWeight: "bold", color: COLORS.black },
        }}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Event Title & Status */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-xl font-bold text-gray-900" numberOfLines={2}>
            {dashboard.event_title}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="calendar-outline" size={14} color={COLORS.gray[500]} />
            <Text className="text-sm text-gray-500 ml-1">
              {formatDate(dashboard.event_date)}
            </Text>
            <View
              className="ml-3 px-2 py-0.5 rounded-full"
              style={{
                backgroundColor:
                  dashboard.status === "published"
                    ? "#DCFCE7"
                    : dashboard.status === "cancelled"
                    ? "#FEE2E2"
                    : dashboard.status === "completed"
                    ? "#DBEAFE"
                    : "#FEF3C7",
              }}
            >
              <Text
                className="text-xs font-semibold capitalize"
                style={{
                  color:
                    dashboard.status === "published"
                      ? "#166534"
                      : dashboard.status === "cancelled"
                      ? "#991B1B"
                      : dashboard.status === "completed"
                      ? "#1E40AF"
                      : "#92400E",
                }}
              >
                {dashboard.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap px-4 mt-2">
          {statCards.map((stat) => (
            <View key={stat.label} className="w-1/2 p-1">
              <View
                className="bg-white rounded-xl p-4 border border-gray-100"
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.03,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <View
                    className="h-8 w-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <Ionicons name={stat.icon} size={16} color={stat.color} />
                  </View>
                </View>
                <Text className="text-xl font-bold text-gray-900">
                  {stat.value}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {stat.label}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Capacity Bar */}
        {stats.capacity > 0 && (
          <View className="mx-5 mt-3 bg-white rounded-xl p-4 border border-gray-100">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-700">
                Capacity
              </Text>
              <Text className="text-sm text-gray-500">
                {stats.total_rsvps} / {stats.capacity}
              </Text>
            </View>
            <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((stats.total_rsvps / stats.capacity) * 100, 100)}%`,
                  backgroundColor:
                    stats.total_rsvps / stats.capacity > 0.9
                      ? COLORS.error
                      : stats.total_rsvps / stats.capacity > 0.7
                      ? COLORS.warning
                      : COLORS.success,
                }}
              />
            </View>
          </View>
        )}

        {/* Revenue Breakdown Chart */}
        {dashboard.revenue_breakdown.length > 0 && (
          <View className="mx-5 mt-3 bg-white rounded-xl p-4 border border-gray-100">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Revenue Breakdown
            </Text>
            {dashboard.revenue_breakdown.map((item, index) => (
              <View key={index} className="mb-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-xs text-gray-600">{item.label}</Text>
                  <Text className="text-xs font-semibold text-gray-800">
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
                <View className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                  <View
                    className="h-full rounded-lg items-end justify-center pr-2"
                    style={{
                      width: `${Math.max((item.amount / maxRevenue) * 100, 5)}%`,
                      backgroundColor: COLORS.primary,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tab Selector: Overview / Attendees */}
        <View className="flex-row mx-5 mt-4 bg-gray-200 rounded-xl p-1">
          {(["overview", "attendees"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                activeTab === tab ? "bg-white" : ""
              }`}
              style={
                activeTab === tab
                  ? {
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }
                  : undefined
              }
            >
              <Text
                className={`text-sm font-semibold capitalize ${
                  activeTab === tab ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Overview Actions */}
        {activeTab === "overview" && (
          <View className="px-5 mt-4 gap-3">
            {/* Post Announcement */}
            <Pressable
              onPress={() => setShowAnnouncementModal(true)}
              className="bg-white rounded-xl p-4 border border-gray-100 flex-row items-center"
            >
              <View
                className="h-10 w-10 rounded-full items-center justify-center"
                style={{ backgroundColor: `${COLORS.info}20` }}
              >
                <Ionicons name="megaphone" size={20} color={COLORS.info} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-gray-900">
                  Post Announcement
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Send an update to all attendees
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </Pressable>

            {/* Reschedule */}
            {dashboard.status !== "cancelled" &&
              dashboard.status !== "completed" && (
                <Pressable
                  onPress={handleReschedule}
                  className="bg-white rounded-xl p-4 border border-gray-100 flex-row items-center"
                >
                  <View
                    className="h-10 w-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${COLORS.warning}20` }}
                  >
                    <Ionicons
                      name="calendar"
                      size={20}
                      color={COLORS.warning}
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-semibold text-gray-900">
                      Reschedule Event
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Change the date or time
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={COLORS.gray[400]}
                  />
                </Pressable>
              )}

            {/* Cancel Event */}
            {dashboard.status === "published" && (
              <Pressable
                onPress={handleCancelEvent}
                disabled={cancelling}
                className="bg-white rounded-xl p-4 border border-red-100 flex-row items-center"
              >
                <View className="h-10 w-10 rounded-full items-center justify-center bg-red-50">
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-red-600">
                    Cancel Event
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Notify attendees and process refunds
                  </Text>
                </View>
                {cancelling ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={COLORS.gray[400]}
                  />
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* Attendees List */}
        {activeTab === "attendees" && (
          <View className="px-5 mt-4">
            {attendees.length === 0 ? (
              <View className="items-center py-12">
                <Ionicons
                  name="people-outline"
                  size={48}
                  color={COLORS.gray[400]}
                />
                <Text className="text-gray-500 mt-3 text-sm">
                  No attendees yet
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {/* Summary */}
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-semibold text-gray-700">
                    {attendees.length} Attendee{attendees.length !== 1 ? "s" : ""}
                  </Text>
                  <View className="flex-row gap-3">
                    {(["confirmed", "pending", "declined", "checked_in"] as const).map(
                      (status) => {
                        const count = attendees.filter(
                          (a) => a.rsvp_status === status
                        ).length;
                        if (count === 0) return null;
                        return (
                          <View key={status} className="flex-row items-center">
                            <View
                              className="h-2 w-2 rounded-full mr-1"
                              style={{
                                backgroundColor: rsvpStatusColor(status),
                              }}
                            />
                            <Text className="text-xs text-gray-500">
                              {count}
                            </Text>
                          </View>
                        );
                      }
                    )}
                  </View>
                </View>

                {/* Attendee Cards */}
                {attendees.map((attendee) => (
                  <View
                    key={attendee.id}
                    className="bg-white rounded-xl p-4 border border-gray-100 flex-row items-center"
                  >
                    <View className="h-10 w-10 rounded-full bg-gray-200 items-center justify-center">
                      {attendee.avatar_url ? (
                        <View className="h-10 w-10 rounded-full bg-gray-300" />
                      ) : (
                        <Ionicons
                          name="person"
                          size={20}
                          color={COLORS.gray[500]}
                        />
                      )}
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        {attendee.display_name}
                      </Text>
                      <View className="flex-row items-center mt-0.5">
                        <Text className="text-xs text-gray-500">
                          {attendee.ticket_type}
                        </Text>
                        <Text className="text-xs text-gray-300 mx-1.5">
                          |
                        </Text>
                        <Text className="text-xs text-gray-400">
                          {formatDate(attendee.rsvp_date)}
                        </Text>
                      </View>
                    </View>
                    <View
                      className="px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: `${rsvpStatusColor(attendee.rsvp_status)}15`,
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color: rsvpStatusColor(attendee.rsvp_status),
                        }}
                      >
                        {rsvpStatusLabel(attendee.rsvp_status)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Announcement Modal */}
      <Modal
        visible={showAnnouncementModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnnouncementModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">
                Post Announcement
              </Text>
              <Pressable onPress={() => setShowAnnouncementModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </Pressable>
            </View>

            <Text className="text-sm text-gray-500 mb-3">
              This message will be sent to all attendees via push notification
              and email.
            </Text>

            <TextInput
              value={announcementText}
              onChangeText={setAnnouncementText}
              placeholder="Write your announcement..."
              placeholderTextColor={COLORS.gray[400]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              style={{ minHeight: 120 }}
            />

            <Pressable
              onPress={handleSendAnnouncement}
              disabled={sendingAnnouncement || !announcementText.trim()}
              className={`py-3.5 rounded-xl items-center ${
                announcementText.trim() ? "bg-green-700" : "bg-gray-300"
              }`}
            >
              {sendingAnnouncement ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Send Announcement
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
