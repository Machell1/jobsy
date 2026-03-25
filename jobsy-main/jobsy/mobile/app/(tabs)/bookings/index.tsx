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
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";

import {
  getBookings,
  getBookingStats,
  updateBookingStatus,
  updateBooking,
  createBooking,
  rescheduleBooking,
  createQuote,
  getQuotes,
  respondToQuote,
  type Booking,
} from "@/api/bookings";
import { useAuthStore } from "@/stores/auth";

interface Quote {
  id: string;
  amount: number;
  status: string;
  note?: string;
  created_at?: string;
}

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
  const router = useRouter();
  const { provider_id: paramProviderId } = useLocalSearchParams<{ provider_id?: string }>();
  const activeRole = useAuthStore((s) => s.user?.activeRole);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [activeTab, setActiveTab] = useState<TabFilter>("All");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTimeStart, setEditTimeStart] = useState('');

  // Create Booking modal state
  const [showCreateModal, setShowCreateModal] = useState(!!paramProviderId);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createProviderId, setCreateProviderId] = useState(paramProviderId || '');
  const [createDate, setCreateDate] = useState('');
  const [createTime, setCreateTime] = useState('');

  // Reschedule modal state
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');

  // Quotes modal state
  const [quotesBooking, setQuotesBooking] = useState<Booking | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [showSendQuoteForm, setShowSendQuoteForm] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNote, setQuoteNote] = useState('');

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

  const editBookingMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { description?: string; scheduled_date?: string; scheduled_time_start?: string } }) =>
      updateBooking(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setEditingBooking(null);
      Alert.alert('Success', 'Booking updated');
    },
    onError: () => Alert.alert('Error', 'Failed to update booking'),
  });

  const createBookingMutation = useMutation({
    mutationFn: () =>
      createBooking({
        provider_id: createProviderId.trim(),
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        scheduled_date: createDate.trim() || undefined,
        scheduled_time_start: createTime.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookingStats'] });
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreateProviderId('');
      setCreateDate('');
      setCreateTime('');
      Alert.alert('Success', 'Booking created');
    },
    onError: () => Alert.alert('Error', 'Failed to create booking'),
  });

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      rescheduleBooking(reschedulingBooking!.id, {
        scheduled_date: rescheduleDate.trim() ?? "",
        scheduled_time_start: rescheduleTime.trim() || undefined,
        note: rescheduleNote.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setReschedulingBooking(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleNote('');
      Alert.alert('Success', 'Booking rescheduled');
    },
    onError: () => Alert.alert('Error', 'Failed to reschedule booking'),
  });

  const sendQuoteMutation = useMutation({
    mutationFn: () =>
      createQuote(quotesBooking!.id, {
        amount: parseFloat(quoteAmount),
        note: quoteNote.trim() || undefined,
      }),
    onSuccess: async () => {
      setShowSendQuoteForm(false);
      setQuoteAmount('');
      setQuoteNote('');
      // Reload quotes
      if (quotesBooking) {
        const q = await getQuotes(quotesBooking.id);
        setQuotes(Array.isArray(q) ? q : []);
      }
      Alert.alert('Success', 'Quote sent');
    },
    onError: () => Alert.alert('Error', 'Failed to send quote'),
  });

  const respondQuoteMutation = useMutation({
    mutationFn: ({ quoteId, action }: { quoteId: string; action: 'accept' | 'reject' }) =>
      respondToQuote(quotesBooking!.id, quoteId, action),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      if (quotesBooking) {
        const q = await getQuotes(quotesBooking.id);
        setQuotes(Array.isArray(q) ? q : []);
      }
    },
    onError: () => Alert.alert('Error', 'Failed to respond to quote'),
  });

  async function openQuotesModal(booking: Booking) {
    setQuotesBooking(booking);
    setLoadingQuotes(true);
    try {
      const q = await getQuotes(booking.id);
      setQuotes(Array.isArray(q) ? q : []);
    } catch {
      setQuotes([]);
    } finally {
      setLoadingQuotes(false);
    }
  }

  async function addToCalendar(booking: Booking) {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Calendar access is needed to add events.");
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar =
        Platform.OS === "ios"
          ? calendars.find((c) => c.source?.name === "Default") || calendars.find((c) => c.allowsModifications) || calendars[0]
          : calendars.find((c) => c.accessLevel === "owner") || calendars.find((c) => c.allowsModifications) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert("Error", "No writable calendar found on this device.");
        return;
      }

      const startDate = booking.scheduled_date
        ? new Date(booking.scheduled_date)
        : new Date();

      if (booking.scheduled_time_start) {
        const [hours, minutes] = booking.scheduled_time_start.split(":").map(Number);
        if (!isNaN(hours)) startDate.setHours(hours, minutes || 0);
      }

      const endDate = new Date(startDate.getTime());
      if (booking.scheduled_time_end) {
        const [hours, minutes] = booking.scheduled_time_end.split(":").map(Number);
        if (!isNaN(hours)) endDate.setHours(hours, minutes || 0);
      } else {
        endDate.setHours(endDate.getHours() + 1);
      }

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: booking.title || "Jobsy Booking",
        notes: booking.description || "",
        location: booking.location_text || "",
        startDate,
        endDate,
        timeZone: "America/Jamaica",
      });

      Alert.alert("Added", "Booking has been added to your calendar.");
    } catch (err) {
      Alert.alert("Error", "Failed to add event to calendar.");
    }
  }

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

  const EDITABLE_STATUSES = ['inquiry', 'quote_sent', 'quote_accepted', 'confirmed', 'in_progress'];
  const ACTIVE_STATUSES = ['inquiry', 'quote_sent', 'quote_accepted', 'confirmed', 'in_progress'];

  function renderBookingItem({ item }: { item: Booking }) {
    const date = item.scheduled_date
      ? new Date(item.scheduled_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

    const isEditable = EDITABLE_STATUSES.includes(item.status);
    const isActive = ACTIVE_STATUSES.includes(item.status);

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
        {/* Action buttons row */}
        <View className="flex-row mt-3 gap-2">
          {isEditable && (
            <Pressable
              onPress={() => {
                setEditingBooking(item);
                setEditDescription(item.description || '');
                setEditDate(item.scheduled_date || '');
                setEditTimeStart(item.scheduled_time_start || '');
              }}
              className="flex-1 flex-row items-center justify-center rounded-lg py-2"
              style={{ backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#4338CA' }}
            >
              <Ionicons name="create-outline" size={14} color="#4338CA" />
              <Text style={{ color: '#4338CA', fontWeight: '600', fontSize: 12, marginLeft: 3 }}>Edit</Text>
            </Pressable>
          )}
          {isActive && (
            <Pressable
              onPress={() => {
                setReschedulingBooking(item);
                setRescheduleDate(item.scheduled_date || '');
                setRescheduleTime(item.scheduled_time_start || '');
                setRescheduleNote('');
              }}
              className="flex-1 flex-row items-center justify-center rounded-lg py-2"
              style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#166534' }}
            >
              <Ionicons name="time-outline" size={14} color="#166534" />
              <Text style={{ color: '#166534', fontWeight: '600', fontSize: 12, marginLeft: 3 }}>Reschedule</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => openQuotesModal(item)}
            className="flex-1 flex-row items-center justify-center rounded-lg py-2"
            style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#92400E' }}
          >
            <Ionicons name="document-text-outline" size={14} color="#92400E" />
            <Text style={{ color: '#92400E', fontWeight: '600', fontSize: 12, marginLeft: 3 }}>Quotes</Text>
          </Pressable>
          {item.scheduled_date && (
            <Pressable
              onPress={() => addToCalendar(item)}
              className="flex-1 flex-row items-center justify-center rounded-lg py-2"
              style={{ backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#0284C7' }}
            >
              <Ionicons name="calendar" size={14} color="#0284C7" />
              <Text style={{ color: '#0284C7', fontWeight: '600', fontSize: 12, marginLeft: 3 }}>Calendar</Text>
            </Pressable>
          )}
          {item.status === 'completed' && (
            <Pressable
              onPress={() => {
                // Determine who to review: if provider, review customer; if customer, review provider
                const revieweeId = canProviderAct
                  ? (item.customer as { display_name: string } & { user_id?: string })?.user_id
                  : (item.provider as { display_name: string } & { user_id?: string })?.user_id;
                if (revieweeId) {
                  router.push({ pathname: '/(tabs)/reviews/write', params: { revieweeId } });
                } else {
                  Alert.alert('Error', 'Could not determine user to review.');
                }
              }}
              className="flex-1 flex-row items-center justify-center rounded-lg py-2"
              style={{ backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: '#F59E0B' }}
            >
              <Ionicons name="star" size={14} color="#D97706" />
              <Text style={{ color: '#D97706', fontWeight: '600', fontSize: 12, marginLeft: 3 }}>Review</Text>
            </Pressable>
          )}
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
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 100, flexGrow: 1 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
            <Text className="text-base text-gray-500 mt-3 font-medium">No bookings yet</Text>
            <Text className="text-sm text-gray-400 mt-1">Your bookings will appear here</Text>
          </View>
        }
      />

      {/* FAB — Create Booking */}
      <Pressable
        onPress={() => setShowCreateModal(true)}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          backgroundColor: '#1B5E20',
          borderRadius: 28,
          paddingHorizontal: 20,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 6 }}>New Booking</Text>
      </Pressable>

      {/* Create Booking Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-bold text-gray-900">New Booking</Text>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-medium text-gray-700 mb-1">Title *</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="e.g. House cleaning"
                value={createTitle}
                onChangeText={setCreateTitle}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', minHeight: 70 }}
                placeholder="Describe what you need..."
                value={createDescription}
                onChangeText={setCreateDescription}
                multiline
                textAlignVertical="top"
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Provider ID *</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="Provider user ID"
                value={createProviderId}
                onChangeText={setCreateProviderId}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Scheduled Date (YYYY-MM-DD)</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="2026-04-15"
                value={createDate}
                onChangeText={setCreateDate}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Start Time (HH:MM)</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-5 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="09:00"
                value={createTime}
                onChangeText={setCreateTime}
              />

              <Pressable
                onPress={() => {
                  if (!createTitle.trim()) {
                    Alert.alert('Required', 'Title is required');
                    return;
                  }
                  if (!createProviderId.trim()) {
                    Alert.alert('Required', 'Provider ID is required');
                    return;
                  }
                  createBookingMutation.mutate();
                }}
                className="rounded-lg py-3 items-center mb-8"
                style={{ backgroundColor: '#1B5E20' }}
                disabled={createBookingMutation.isPending}
              >
                <Text className="text-white font-semibold text-base">
                  {createBookingMutation.isPending ? 'Creating...' : 'Create Booking'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={!!reschedulingBooking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReschedulingBooking(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-bold text-gray-900">Reschedule Booking</Text>
              <Pressable onPress={() => setReschedulingBooking(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm text-gray-600 mb-4">
                {reschedulingBooking?.title}
              </Text>

              <Text className="text-sm font-medium text-gray-700 mb-1">New Date (YYYY-MM-DD)</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="2026-04-20"
                value={rescheduleDate}
                onChangeText={setRescheduleDate}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">New Start Time (HH:MM)</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="10:00"
                value={rescheduleTime}
                onChangeText={setRescheduleTime}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Note (optional)</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-5 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', minHeight: 70 }}
                placeholder="Reason for rescheduling..."
                value={rescheduleNote}
                onChangeText={setRescheduleNote}
                multiline
                textAlignVertical="top"
              />

              <Pressable
                onPress={() => rescheduleMutation.mutate()}
                className="rounded-lg py-3 items-center mb-8"
                style={{ backgroundColor: '#166534' }}
                disabled={rescheduleMutation.isPending}
              >
                <Text className="text-white font-semibold text-base">
                  {rescheduleMutation.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Quotes Modal */}
      <Modal visible={!!quotesBooking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setQuotesBooking(null); setShowSendQuoteForm(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900">Quotes</Text>
              <Pressable onPress={() => { setQuotesBooking(null); setShowSendQuoteForm(false); }}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            {quotesBooking && (
              <Text className="text-sm text-gray-600 mb-4" numberOfLines={1}>{quotesBooking.title}</Text>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingQuotes ? (
                <ActivityIndicator size="small" color="#1B5E20" style={{ marginVertical: 20 }} />
              ) : quotes.length === 0 ? (
                <View className="items-center py-10">
                  <Ionicons name="document-outline" size={40} color="#9CA3AF" />
                  <Text className="text-sm text-gray-500 mt-2">No quotes yet</Text>
                </View>
              ) : (
                quotes.map((q: Quote) => (
                  <View
                    key={q.id}
                    className="bg-white rounded-xl p-4 mb-3"
                    style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-base font-bold text-gray-900">${q.amount?.toFixed(2)}</Text>
                      <View style={{
                        backgroundColor: q.status === 'accepted' ? '#DCFCE7' : q.status === 'rejected' ? '#FEE2E2' : '#DBEAFE',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}>
                        <Text style={{
                          color: q.status === 'accepted' ? '#166534' : q.status === 'rejected' ? '#991B1B' : '#1E40AF',
                          fontSize: 11,
                          fontWeight: '600',
                          textTransform: 'capitalize',
                        }}>{q.status || 'pending'}</Text>
                      </View>
                    </View>
                    {q.note && <Text className="text-sm text-gray-600 mb-3">{q.note}</Text>}

                    {/* Hirer actions */}
                    {activeRole !== 'provider' && q.status === 'pending' && (
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => respondQuoteMutation.mutate({ quoteId: q.id, action: 'accept' })}
                          className="flex-1 rounded-lg py-2 items-center"
                          style={{ backgroundColor: '#166534' }}
                          disabled={respondQuoteMutation.isPending}
                        >
                          <Text className="text-white font-semibold text-sm">Accept</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => respondQuoteMutation.mutate({ quoteId: q.id, action: 'reject' })}
                          className="flex-1 rounded-lg py-2 items-center"
                          style={{ backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#991B1B' }}
                          disabled={respondQuoteMutation.isPending}
                        >
                          <Text style={{ color: '#991B1B', fontWeight: '600', fontSize: 13 }}>Reject</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))
              )}

              {/* Provider: Send Quote form */}
              {canProviderAct && quotesBooking && ['inquiry', 'quote_sent'].includes(quotesBooking.status) && (
                <>
                  {showSendQuoteForm ? (
                    <View className="bg-white rounded-xl p-4 mb-3" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
                      <Text className="text-sm font-bold text-gray-900 mb-3">Send Quote</Text>

                      <Text className="text-sm font-medium text-gray-700 mb-1">Amount ($) *</Text>
                      <TextInput
                        className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                        style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                        placeholder="0.00"
                        value={quoteAmount}
                        onChangeText={setQuoteAmount}
                        keyboardType="decimal-pad"
                      />

                      <Text className="text-sm font-medium text-gray-700 mb-1">Note (optional)</Text>
                      <TextInput
                        className="bg-gray-50 rounded-lg px-3 py-2.5 mb-4 text-sm text-gray-900"
                        style={{ borderWidth: 1, borderColor: '#E5E7EB', minHeight: 60 }}
                        placeholder="Details about your quote..."
                        value={quoteNote}
                        onChangeText={setQuoteNote}
                        multiline
                        textAlignVertical="top"
                      />

                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => setShowSendQuoteForm(false)}
                          className="flex-1 rounded-lg py-2.5 items-center"
                          style={{ backgroundColor: '#F3F4F6' }}
                        >
                          <Text style={{ color: '#374151', fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            if (!quoteAmount || isNaN(parseFloat(quoteAmount))) {
                              Alert.alert('Required', 'Enter a valid amount');
                              return;
                            }
                            sendQuoteMutation.mutate();
                          }}
                          className="flex-1 rounded-lg py-2.5 items-center"
                          style={{ backgroundColor: '#1E40AF' }}
                          disabled={sendQuoteMutation.isPending}
                        >
                          <Text className="text-white font-semibold text-sm">
                            {sendQuoteMutation.isPending ? 'Sending...' : 'Send'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setShowSendQuoteForm(true)}
                      className="rounded-lg py-3 items-center mb-2 flex-row justify-center"
                      style={{ backgroundColor: '#1E40AF' }}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text className="text-white font-semibold text-sm ml-1">Send Quote</Text>
                    </Pressable>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Booking Modal */}
      <Modal visible={!!editingBooking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingBooking(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900">Edit Booking</Text>
              <Pressable onPress={() => setEditingBooking(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', minHeight: 80 }}
                placeholder="Describe the booking..."
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                textAlignVertical="top"
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Scheduled Date (YYYY-MM-DD)</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="2026-04-15"
                value={editDate}
                onChangeText={setEditDate}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Start Time (HH:MM)</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-4 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="09:00"
                value={editTimeStart}
                onChangeText={setEditTimeStart}
              />

              <Pressable
                onPress={() => {
                  if (!editingBooking) return;
                  editBookingMutation.mutate({
                    id: editingBooking.id,
                    data: {
                      description: editDescription || undefined,
                      scheduled_date: editDate || undefined,
                      scheduled_time_start: editTimeStart || undefined,
                    },
                  });
                }}
                className="rounded-lg py-3 items-center mb-8"
                style={{ backgroundColor: '#1B5E20' }}
                disabled={editBookingMutation.isPending}
              >
                <Text className="text-white font-semibold text-base">
                  {editBookingMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
