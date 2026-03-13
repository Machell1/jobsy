import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import {
  getBookings,
  getBookingStats,
  updateBookingStatus,
  type Booking,
} from "@/api/bookings";
import { useAuthStore } from "@/stores/auth";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  inquiry: { label: "Inquiry", color: "#92400E", bg: "#FEF3C7" },
  quote_sent: { label: "Quote Sent", color: "#1E40AF", bg: "#DBEAFE" },
  quote_accepted: { label: "Accepted", color: "#1E40AF", bg: "#DBEAFE" },
  confirmed: { label: "Confirmed", color: "#6B21A8", bg: "#F3E8FF" },
  in_progress: { label: "In Progress", color: "#6B21A8", bg: "#F3E8FF" },
  completed: { label: "Completed", color: "#166534", bg: "#DCFCE7" },
  cancelled: { label: "Cancelled", color: "#991B1B", bg: "#FEE2E2" },
  declined: { label: "Declined", color: "#991B1B", bg: "#FEE2E2" },
};

const TABS = ["All", "Active", "Completed", "Cancelled"] as const;
type TabFilter = (typeof TABS)[number];

function getFilteredBookings(bookings: Booking[], tab: TabFilter): Booking[] {
  if (tab === "All") return bookings;
  if (tab === "Active")
    return bookings.filter((b) =>
      ["inquiry", "quote_sent", "quote_accepted", "confirmed", "in_progress"].includes(b.status)
    );
  if (tab === "Completed") return bookings.filter((b) => b.status === "completed");
  if (tab === "Cancelled")
    return bookings.filter((b) => ["cancelled", "declined"].includes(b.status));
  return bookings;
}

function StatusBadge({ status }: { status: string }) {
  const mapped = STATUS_MAP[status] || { label: status, color: "#374151", bg: "#F3F4F6" };
  return (
    <View style={{ backgroundColor: mapped.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
      <Text style={{ color: mapped.color, fontSize: 12, fontWeight: "600" }}>{mapped.label}</Text>
    </View>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <View className="flex-1 bg-white rounded-xl p-3 mr-2" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
      <Text className="text-xs text-gray-500 mb-1">{title}</Text>
      <Text style={{ color, fontSize: 20, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

export default function BookingsScreen() {
  const queryClient = useQueryClient();
  const activeRole = useAuthStore((s) => s.user?.activeRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [activeTab, setActiveTab] = useState<TabFilter>("All");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const {
    data: bookings = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookings,
    enabled: isAuthenticated,
  });

  const { data: stats } = useQuery({
    queryKey: ["bookingStats"],
    queryFn: getBookingStats,
    enabled: isAuthenticated,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookingStats"] });
      setSelectedBooking(null);
    },
  });

  const filteredBookings = getFilteredBookings(bookings, activeTab);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const canProviderAct = activeRole === "provider";

  function getActions(booking: Booking): { label: string; status: string; color: string }[] {
    const actions: { label: string; status: string; color: string }[] = [];
    const s = booking.status;

    if (canProviderAct && s === "inquiry") {
      actions.push({ label: "Send Quote", status: "quote_sent", color: "#1E40AF" });
      actions.push({ label: "Decline", status: "declined", color: "#991B1B" });
    }
    if (["inquiry", "quote_sent", "quote_accepted", "confirmed", "in_progress"].includes(s)) {
      actions.push({ label: "Cancel", status: "cancelled", color: "#991B1B" });
    }
    if (canProviderAct && (s === "confirmed" || s === "in_progress")) {
      actions.push({ label: "Mark Complete", status: "completed", color: "#166534" });
    }
    return actions;
  }

  function renderBookingItem({ item }: { item: Booking }) {
    const date = item.scheduled_date
      ? new Date(item.scheduled_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

    return (
      <Pressable
        className="bg-white mx-4 mb-3 rounded-xl p-4"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
        onPress={() => setSelectedBooking(item)}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>
            {item.title}
          </Text>
          <StatusBadge status={item.status} />
        </View>
        {item.description ? (
          <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            {date ? (
              <>
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-500 ml-1">{date}</Text>
              </>
            ) : null}
          </View>
          {item.total_amount != null ? (
            <Text className="text-sm font-semibold text-green-700">
              ${item.total_amount.toFixed(2)}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  const activeCount = stats?.by_status
    ? ["inquiry", "quote_sent", "quote_accepted", "confirmed", "in_progress"].reduce(
        (sum, s) => sum + (stats.by_status[s] || 0),
        0
      )
    : 0;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Stats Cards */}
      <View className="flex-row px-4 pt-3 pb-2">
        <StatCard title="Total" value={stats?.total ?? 0} color="#1B5E20" />
        <StatCard title="Active" value={activeCount} color="#1E40AF" />
        <StatCard title="Completed" value={stats?.by_status?.completed ?? 0} color="#166534" />
        <View className="flex-1 bg-white rounded-xl p-3" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <Text className="text-xs text-gray-500 mb-1">Cancelled</Text>
          <Text style={{ color: "#991B1B", fontSize: 20, fontWeight: "700" }}>
            {(stats?.by_status?.cancelled ?? 0) + (stats?.by_status?.declined ?? 0)}
          </Text>
        </View>
      </View>

      {/* Tab Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className="mr-2 rounded-full px-4 py-2"
            style={{
              backgroundColor: activeTab === tab ? "#1B5E20" : "#F3F4F6",
            }}
          >
            <Text
              style={{
                color: activeTab === tab ? "#FFFFFF" : "#374151",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Booking List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E20" />}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 20, flexGrow: 1 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
            <Text className="text-base text-gray-500 mt-3 font-medium">No bookings yet</Text>
            <Text className="text-sm text-gray-400 mt-1">Your bookings will appear here</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={!!selectedBooking} transparent animationType="slide" onRequestClose={() => setSelectedBooking(null)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setSelectedBooking(null)}>
          <Pressable className="bg-white rounded-t-2xl p-5 pb-10" onPress={(e) => e.stopPropagation()}>
            {selectedBooking && (
              <>
                <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-bold text-gray-900 flex-1 mr-2">{selectedBooking.title}</Text>
                  <StatusBadge status={selectedBooking.status} />
                </View>

                {selectedBooking.description ? (
                  <Text className="text-sm text-gray-600 mb-3">{selectedBooking.description}</Text>
                ) : null}

                <View className="bg-gray-50 rounded-lg p-3 mb-4">
                  {selectedBooking.scheduled_date && (
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                      <Text className="text-sm text-gray-700 ml-2">
                        {new Date(selectedBooking.scheduled_date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  )}
                  {selectedBooking.scheduled_time_start && (
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text className="text-sm text-gray-700 ml-2">
                        {selectedBooking.scheduled_time_start}
                        {selectedBooking.scheduled_time_end ? ` - ${selectedBooking.scheduled_time_end}` : ""}
                      </Text>
                    </View>
                  )}
                  {selectedBooking.location_text && (
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="location-outline" size={16} color="#6B7280" />
                      <Text className="text-sm text-gray-700 ml-2">{selectedBooking.location_text}</Text>
                    </View>
                  )}
                  {selectedBooking.total_amount != null && (
                    <View className="flex-row items-center">
                      <Ionicons name="cash-outline" size={16} color="#6B7280" />
                      <Text className="text-sm font-semibold text-green-700 ml-2">
                        ${selectedBooking.total_amount.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>

                {(selectedBooking.customer || selectedBooking.provider) && (
                  <View className="mb-4">
                    {selectedBooking.customer && (
                      <Text className="text-sm text-gray-600">
                        Customer: <Text className="font-semibold">{selectedBooking.customer.display_name}</Text>
                      </Text>
                    )}
                    {selectedBooking.provider && (
                      <Text className="text-sm text-gray-600 mt-1">
                        Provider: <Text className="font-semibold">{selectedBooking.provider.display_name}</Text>
                      </Text>
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                {getActions(selectedBooking).length > 0 && (
                  <View className="flex-row flex-wrap gap-2">
                    {getActions(selectedBooking).map((action) => (
                      <Pressable
                        key={action.status}
                        onPress={() =>
                          statusMutation.mutate({
                            id: selectedBooking.id,
                            status: action.status,
                          })
                        }
                        className="flex-1 min-w-[120px] rounded-lg py-3 items-center"
                        style={{ backgroundColor: action.color }}
                        disabled={statusMutation.isPending}
                      >
                        <Text className="text-white font-semibold text-sm">
                          {statusMutation.isPending ? "..." : action.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
