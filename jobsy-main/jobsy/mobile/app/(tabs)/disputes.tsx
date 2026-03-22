import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { api } from "@/api/client";
import { uploadFile } from "@/api/storage";
import { COLORS } from "@/constants/theme";
import { formatDate } from "@/utils/format";

// ── Types ────────────────────────────────────────────────────────────────

type DisputeStatus = "open" | "under_review" | "resolved" | "closed";

type DisputeType = "booking" | "contract";

interface Dispute {
  id: string;
  booking_id?: string;
  contract_id?: string;
  dispute_type?: DisputeType;
  job_reference: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  filed_at: string;
  resolved_at: string | null;
  filed_by_me: boolean;
  timeline: TimelineEvent[];
}

interface TimelineEvent {
  id: string;
  status: DisputeStatus;
  note: string;
  created_at: string;
}

type TabFilter = "all" | "open" | "resolved";

const REASON_OPTIONS = [
  { label: "Select a reason...", value: "" },
  { label: "Service not delivered", value: "service_not_delivered" },
  { label: "Poor quality work", value: "poor_quality" },
  { label: "Late delivery", value: "late_delivery" },
  { label: "Overcharged", value: "overcharged" },
  { label: "Provider no-show", value: "no_show" },
  { label: "Hirer didn't pay", value: "non_payment" },
  { label: "Harassment or misconduct", value: "misconduct" },
  { label: "Other", value: "other" },
];

// ── Status helpers ───────────────────────────────────────────────────────

function statusColor(status: DisputeStatus): string {
  switch (status) {
    case "open":
      return COLORS.warning;
    case "under_review":
      return COLORS.info;
    case "resolved":
      return COLORS.success;
    case "closed":
      return COLORS.gray[500];
  }
}

function statusLabel(status: DisputeStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "under_review":
      return "Under Review";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
  }
}

function statusIcon(status: DisputeStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case "open":
      return "alert-circle";
    case "under_review":
      return "time";
    case "resolved":
      return "checkmark-circle";
    case "closed":
      return "close-circle";
  }
}

// ── Main Screen ──────────────────────────────────────────────────────────

export default function DisputesScreen() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  // File new dispute modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDisputeType, setNewDisputeType] = useState<DisputeType>("booking");
  const [newReason, setNewReason] = useState("");
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newBookingId, setNewBookingId] = useState("");
  const [newContractId, setNewContractId] = useState("");
  const [evidenceUris, setEvidenceUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Detail/timeline modal
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────

  const fetchDisputes = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<Dispute[]>("/api/disputes");
      setDisputes(data);
    } catch {
      setError("Could not load disputes. Please try again.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchDisputes();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDisputes();
  }, [fetchDisputes]);

  // ── Filtering ────────────────────────────────────────────────────────

  const filteredDisputes = disputes.filter((d) => {
    if (activeTab === "all") return true;
    if (activeTab === "open") return d.status === "open" || d.status === "under_review";
    if (activeTab === "resolved") return d.status === "resolved" || d.status === "closed";
    return true;
  });

  // ── File new dispute ─────────────────────────────────────────────────

  const handlePickEvidence = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });
      if (result.canceled || !result.assets?.length) return;
      setEvidenceUris((prev) => [
        ...prev,
        ...result.assets.map((a) => a.uri),
      ].slice(0, 5));
    } catch {
      Alert.alert("Error", "Could not open image picker.");
    }
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDispute = async () => {
    if (!newReason) {
      Alert.alert("Missing Info", "Please select a reason for the dispute.");
      return;
    }
    if (!newDescription.trim()) {
      Alert.alert("Missing Info", "Please describe the issue.");
      return;
    }

    setSubmitting(true);
    try {
      // Create dispute
      const payload: Record<string, unknown> = {
        reason: newReason,
        description: newDescription.trim(),
        dispute_type: newDisputeType,
      };
      if (newDisputeType === "booking" && newBookingId) {
        payload.booking_id = newBookingId;
      } else if (newDisputeType === "contract" && newContractId) {
        payload.contract_id = newContractId;
      }
      const { data: dispute } = await api.post<Dispute>("/api/disputes", payload);

      // Upload evidence if any
      for (const uri of evidenceUris) {
        try {
          const uploaded = await uploadFile(uri, "disputes/evidence");
          await api.post(`/api/disputes/${dispute.id}/evidence`, {
            file_url: uploaded.url,
          });
        } catch {
          // Continue with other uploads even if one fails
        }
      }

      // Reset form
      setShowNewModal(false);
      setNewDisputeType("booking");
      setNewReason("");
      setNewDescription("");
      setNewBookingId("");
      setNewContractId("");
      setEvidenceUris([]);
      fetchDisputes();
      Alert.alert("Dispute Filed", "Your dispute has been submitted and is now under review.");
    } catch {
      Alert.alert("Error", "Could not file dispute. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndCloseModal = () => {
    setShowNewModal(false);
    setNewDisputeType("booking");
    setNewReason("");
    setNewDescription("");
    setNewBookingId("");
    setNewContractId("");
    setEvidenceUris([]);
  };

  // ── Tab pills ────────────────────────────────────────────────────────

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "open", label: "Open" },
    { key: "resolved", label: "Resolved" },
  ];

  // ── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-gray-500 mt-3">Loading disputes...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Disputes</Text>
          <Pressable
            onPress={() => setShowNewModal(true)}
            className="bg-green-700 px-4 py-2 rounded-xl flex-row items-center gap-1.5"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white font-semibold text-sm">File Dispute</Text>
          </Pressable>
        </View>

        {/* Tab filters */}
        <View className="flex-row mt-4 gap-2">
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full ${
                activeTab === tab.key
                  ? "bg-green-700"
                  : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  activeTab === tab.key ? "text-white" : "text-gray-600"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Error */}
      {error && (
        <View className="mx-5 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <Text className="text-red-700 text-sm">{error}</Text>
          <Pressable onPress={fetchDisputes} className="mt-2">
            <Text className="text-red-600 font-semibold text-sm">Tap to retry</Text>
          </Pressable>
        </View>
      )}

      {/* Dispute list */}
      <FlatList
        data={filteredDisputes}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 40, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedDispute(item)}
            className="bg-white rounded-xl border border-gray-200 p-4 mb-3"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {item.job_reference ||
                    (item.contract_id
                      ? `Contract #${item.contract_id.slice(0, 8)}`
                      : item.booking_id
                        ? `Booking #${item.booking_id.slice(0, 8)}`
                        : "Dispute")}
                </Text>
                <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                  {REASON_OPTIONS.find((r) => r.value === item.reason)?.label || item.reason}
                </Text>
              </View>
              <View
                className="px-3 py-1 rounded-full flex-row items-center gap-1"
                style={{ backgroundColor: statusColor(item.status) + "20" }}
              >
                <Ionicons
                  name={statusIcon(item.status)}
                  size={14}
                  color={statusColor(item.status)}
                />
                <Text
                  className="text-xs font-semibold"
                  style={{ color: statusColor(item.status) }}
                >
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center mt-3 gap-4">
              <View className="flex-row items-center gap-1">
                <Ionicons name="calendar-outline" size={14} color={COLORS.gray[500]} />
                <Text className="text-xs text-gray-500">Filed {formatDate(item.filed_at)}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons
                  name={item.filed_by_me ? "arrow-up-circle-outline" : "arrow-down-circle-outline"}
                  size={14}
                  color={COLORS.gray[500]}
                />
                <Text className="text-xs text-gray-500">
                  {item.filed_by_me ? "Filed by you" : "Filed against you"}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 pt-16">
            <Ionicons name="shield-checkmark-outline" size={64} color={COLORS.gray[400]} />
            <Text className="mt-4 text-lg font-semibold text-gray-700">No disputes</Text>
            <Text className="mt-2 text-center text-sm text-gray-400">
              {activeTab === "all"
                ? "You haven't filed or received any disputes yet."
                : `No ${activeTab} disputes found.`}
            </Text>
          </View>
        }
      />

      {/* ── Timeline Detail Modal ─────────────────────────────────────── */}
      <Modal
        visible={!!selectedDispute}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedDispute(null)}
      >
        <View className="flex-1 bg-gray-50">
          <View className="bg-white px-5 pt-6 pb-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">Dispute Details</Text>
            <Pressable onPress={() => setSelectedDispute(null)}>
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </Pressable>
          </View>

          {selectedDispute && (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            >
              {/* Summary card */}
              <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <Text className="text-base font-semibold text-gray-900">
                  {selectedDispute.job_reference ||
                    (selectedDispute.contract_id
                      ? `Contract #${selectedDispute.contract_id.slice(0, 8)}`
                      : selectedDispute.booking_id
                        ? `Booking #${selectedDispute.booking_id.slice(0, 8)}`
                        : "Dispute")}
                </Text>
                <View className="flex-row items-center mt-2 gap-2">
                  <View
                    className="px-3 py-1 rounded-full flex-row items-center gap-1"
                    style={{
                      backgroundColor: statusColor(selectedDispute.status) + "20",
                    }}
                  >
                    <Ionicons
                      name={statusIcon(selectedDispute.status)}
                      size={14}
                      color={statusColor(selectedDispute.status)}
                    />
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: statusColor(selectedDispute.status) }}
                    >
                      {statusLabel(selectedDispute.status)}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm text-gray-600 mt-3 leading-5">
                  {selectedDispute.description}
                </Text>
                <Text className="text-xs text-gray-400 mt-2">
                  Reason:{" "}
                  {REASON_OPTIONS.find((r) => r.value === selectedDispute.reason)?.label ||
                    selectedDispute.reason}
                </Text>
              </View>

              {/* Timeline */}
              <Text className="text-base font-semibold text-gray-900 mb-3">
                Status Timeline
              </Text>
              {selectedDispute.timeline && selectedDispute.timeline.length > 0 ? (
                <View className="ml-2">
                  {selectedDispute.timeline.map((event, index) => (
                    <View key={event.id} className="flex-row mb-4">
                      {/* Line + dot */}
                      <View className="items-center mr-3" style={{ width: 20 }}>
                        <View
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: statusColor(event.status) }}
                        />
                        {index < selectedDispute.timeline.length - 1 && (
                          <View className="w-0.5 flex-1 bg-gray-300 mt-1" />
                        )}
                      </View>
                      {/* Content */}
                      <View className="flex-1 pb-2">
                        <Text className="text-sm font-semibold text-gray-800">
                          {statusLabel(event.status)}
                        </Text>
                        {event.note ? (
                          <Text className="text-sm text-gray-500 mt-0.5">
                            {event.note}
                          </Text>
                        ) : null}
                        <Text className="text-xs text-gray-400 mt-1">
                          {formatDate(event.created_at)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="bg-white rounded-xl border border-gray-200 p-4 items-center">
                  <Ionicons name="time-outline" size={32} color={COLORS.gray[400]} />
                  <Text className="text-sm text-gray-500 mt-2">
                    No timeline events yet.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ── File New Dispute Modal ────────────────────────────────────── */}
      <Modal
        visible={showNewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetAndCloseModal}
      >
        <View className="flex-1 bg-gray-50">
          <View className="bg-white px-5 pt-6 pb-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">File a Dispute</Text>
            <Pressable onPress={resetAndCloseModal}>
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Dispute Type Selector */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Dispute Type
            </Text>
            <View className="flex-row mb-4 gap-2">
              <Pressable
                onPress={() => setNewDisputeType("booking")}
                className={`flex-1 py-3 rounded-xl items-center border-2 ${
                  newDisputeType === "booking"
                    ? "border-green-700 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={newDisputeType === "booking" ? COLORS.primary : COLORS.gray[500]}
                />
                <Text
                  className={`text-sm font-semibold mt-1 ${
                    newDisputeType === "booking" ? "text-green-700" : "text-gray-500"
                  }`}
                >
                  Booking Dispute
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setNewDisputeType("contract")}
                className={`flex-1 py-3 rounded-xl items-center border-2 ${
                  newDisputeType === "contract"
                    ? "border-green-700 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={newDisputeType === "contract" ? COLORS.primary : COLORS.gray[500]}
                />
                <Text
                  className={`text-sm font-semibold mt-1 ${
                    newDisputeType === "contract" ? "text-green-700" : "text-gray-500"
                  }`}
                >
                  Contract Dispute
                </Text>
              </Pressable>
            </View>

            {/* Reference ID based on type */}
            {newDisputeType === "booking" ? (
              <>
                <Text className="text-sm font-semibold text-gray-700 mb-1.5">
                  Booking Reference (optional)
                </Text>
                <TextInput
                  value={newBookingId}
                  onChangeText={setNewBookingId}
                  placeholder="Enter booking ID or leave blank"
                  className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
                  placeholderTextColor={COLORS.gray[400]}
                />
              </>
            ) : (
              <>
                <Text className="text-sm font-semibold text-gray-700 mb-1.5">
                  Contract Reference (optional)
                </Text>
                <TextInput
                  value={newContractId}
                  onChangeText={setNewContractId}
                  placeholder="Enter contract ID or leave blank"
                  className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
                  placeholderTextColor={COLORS.gray[400]}
                />
              </>
            )}

            {/* Reason dropdown */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Reason <Text className="text-red-400">*</Text>
            </Text>
            <Pressable
              onPress={() => setShowReasonPicker(true)}
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between"
            >
              <Text
                className={`text-sm ${newReason ? "text-gray-900" : "text-gray-400"}`}
              >
                {newReason
                  ? REASON_OPTIONS.find((r) => r.value === newReason)?.label
                  : "Select a reason..."}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.gray[400]} />
            </Pressable>

            {/* Description */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Description <Text className="text-red-400">*</Text>
            </Text>
            <TextInput
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Describe the issue in detail..."
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
              style={{ minHeight: 120 }}
              placeholderTextColor={COLORS.gray[400]}
            />

            {/* Evidence upload */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Evidence (up to 5 images)
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {evidenceUris.map((uri, index) => (
                <View
                  key={index}
                  className="w-20 h-20 rounded-xl bg-gray-200 items-center justify-center"
                >
                  <Ionicons name="image" size={24} color={COLORS.primary} />
                  <Pressable
                    onPress={() => handleRemoveEvidence(index)}
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {evidenceUris.length < 5 && (
                <Pressable
                  onPress={handlePickEvidence}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 items-center justify-center"
                >
                  <Ionicons name="camera-outline" size={24} color={COLORS.gray[400]} />
                  <Text className="text-xs text-gray-400 mt-1">Add</Text>
                </Pressable>
              )}
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleSubmitDispute}
              disabled={submitting}
              className={`py-3.5 rounded-xl items-center mt-2 ${
                submitting ? "bg-gray-300" : "bg-green-700"
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Submit Dispute
                </Text>
              )}
            </Pressable>
          </ScrollView>

          {/* Reason picker bottom sheet */}
          <Modal
            visible={showReasonPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowReasonPicker(false)}
          >
            <Pressable
              className="flex-1 bg-black/40"
              onPress={() => setShowReasonPicker(false)}
            />
            <View className="bg-white rounded-t-3xl pb-10">
              <View className="px-5 pt-5 pb-3 border-b border-gray-200">
                <Text className="text-base font-bold text-gray-900">
                  Select Reason
                </Text>
              </View>
              <ScrollView style={{ maxHeight: 350 }}>
                {REASON_OPTIONS.filter((r) => r.value !== "").map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setNewReason(option.value);
                      setShowReasonPicker(false);
                    }}
                    className={`px-5 py-4 border-b border-gray-100 flex-row items-center justify-between ${
                      newReason === option.value ? "bg-green-50" : ""
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        newReason === option.value
                          ? "text-green-700 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {option.label}
                    </Text>
                    {newReason === option.value && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Modal>
        </View>
      </Modal>
    </View>
  );
}
