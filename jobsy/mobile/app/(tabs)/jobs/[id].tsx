import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import {
  getJobPost,
  getJobBids,
  submitBid,
  updateBidStatus,
  type JobPost,
  type Bid,
} from "@/api/bidding";
import { useAuthStore } from "@/stores/auth";

// ========== Status Badge Colors ==========

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "#DCFCE7", text: "#166534" },
  bidding_closed: { bg: "#FEF3C7", text: "#92400E" },
  awarded: { bg: "#DBEAFE", text: "#1E40AF" },
  in_progress: { bg: "#F3E8FF", text: "#6B21A8" },
  completed: { bg: "#DCFCE7", text: "#166534" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B" },
  submitted: { bg: "#FEF3C7", text: "#92400E" },
  shortlisted: { bg: "#DBEAFE", text: "#1E40AF" },
  accepted: { bg: "#DCFCE7", text: "#166534" },
  rejected: { bg: "#FEE2E2", text: "#991B1B" },
  withdrawn: { bg: "#F3F4F6", text: "#374151" },
  pending_signatures: { bg: "#FEF3C7", text: "#92400E" },
  fully_signed: { bg: "#DCFCE7", text: "#166534" },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || { bg: "#F3F4F6", text: "#374151" };
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function formatBudget(min?: number, max?: number, currency = "JMD") {
  const sym = currency === "JMD" ? "J$" : "$";
  if (min != null && max != null) return `${sym}${min.toLocaleString()} - ${sym}${max.toLocaleString()}`;
  if (min != null) return `From ${sym}${min.toLocaleString()}`;
  if (max != null) return `Up to ${sym}${max.toLocaleString()}`;
  return "Negotiable";
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ========== Main Screen ==========

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // Bid form state
  const [bidAmount, setBidAmount] = useState("");
  const [bidProposal, setBidProposal] = useState("");
  const [bidDuration, setBidDuration] = useState("");
  const [bidStartDate, setBidStartDate] = useState("");

  const {
    data: job,
    isLoading: loadingJob,
  } = useQuery({
    queryKey: ["jobPost", id],
    queryFn: () => getJobPost(id!),
    enabled: !!id,
  });

  const {
    data: bids = [],
    isLoading: loadingBids,
  } = useQuery({
    queryKey: ["jobBids", id],
    queryFn: () => getJobBids(id!),
    enabled: !!id,
  });

  const submitBidMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => submitBid(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobBids", id] });
      queryClient.invalidateQueries({ queryKey: ["jobPost", id] });
      queryClient.invalidateQueries({ queryKey: ["myBids"] });
      queryClient.invalidateQueries({ queryKey: ["biddingStats"] });
      setBidAmount("");
      setBidProposal("");
      setBidDuration("");
      setBidStartDate("");
      Alert.alert("Success", "Your bid has been submitted!");
    },
    onError: () => Alert.alert("Error", "Failed to submit bid. Please try again."),
  });

  const bidStatusMutation = useMutation({
    mutationFn: ({ bidId, status, hirer_note }: { bidId: string; status: string; hirer_note?: string }) =>
      updateBidStatus(id!, bidId, { status, hirer_note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobBids", id] });
      queryClient.invalidateQueries({ queryKey: ["jobPost", id] });
      queryClient.invalidateQueries({ queryKey: ["biddingStats"] });
    },
    onError: () => Alert.alert("Error", "Failed to update bid status."),
  });

  function handleSubmitBid() {
    if (!bidAmount.trim() || !bidProposal.trim()) {
      Alert.alert("Required", "Please enter an amount and proposal.");
      return;
    }
    submitBidMutation.mutate({
      amount: Number(bidAmount),
      currency: "JMD",
      proposal: bidProposal.trim(),
      estimated_duration_days: bidDuration ? Number(bidDuration) : undefined,
      available_start_date: bidStartDate || undefined,
    });
  }

  function handleBidAction(bidId: string, status: string, label: string) {
    Alert.alert("Confirm", `Are you sure you want to ${label.toLowerCase()} this bid?`, [
      { text: "Cancel", style: "cancel" },
      { text: label, onPress: () => bidStatusMutation.mutate({ bidId, status }) },
    ]);
  }

  const isHirer = user?.id === job?.hirer_id;
  const myBid = bids.find((b) => b.provider_id === user?.id);
  const canBid = !isHirer && !myBid && job?.status === "open";
  const acceptedBid = bids.find((b) => b.status === "accepted" || b.is_winner);

  if (loadingJob) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  if (!job) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text className="text-base text-gray-500 mt-3">Job post not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ color: "#1B5E20", fontWeight: "600" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 pt-4 pb-4">
          <Pressable onPress={() => router.back()} className="flex-row items-center mb-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
            <Text className="text-sm text-gray-600 ml-1">Back</Text>
          </Pressable>

          <View className="flex-row items-start justify-between mb-2">
            <Text className="text-xl font-bold text-gray-900 flex-1 mr-2">{job.title}</Text>
            <StatusBadge status={job.status} />
          </View>

          <View className="flex-row items-center mb-3 flex-wrap gap-2">
            <View style={{ backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
              <Text style={{ color: "#4338CA", fontSize: 12, fontWeight: "600" }}>{job.category}</Text>
            </View>
            {job.parish && (
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text className="text-sm text-gray-500 ml-0.5">{job.parish}</Text>
              </View>
            )}
          </View>

          {/* Hirer info */}
          {job.hirer && (
            <View className="flex-row items-center mb-3">
              <View
                className="rounded-full items-center justify-center"
                style={{ width: 32, height: 32, backgroundColor: "#E5E7EB" }}
              >
                <Ionicons name="person" size={18} color="#6B7280" />
              </View>
              <Text className="text-sm text-gray-700 ml-2 font-medium">{job.hirer.display_name}</Text>
              <Text className="text-xs text-gray-400 ml-2">Posted {formatDate(job.created_at)}</Text>
            </View>
          )}
        </View>

        {/* Details Section */}
        <View className="bg-white mx-4 mt-3 rounded-xl p-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <Text className="text-sm font-semibold text-gray-900 mb-2">Description</Text>
          <Text className="text-sm text-gray-600 leading-5">{job.description}</Text>

          {job.required_skills?.length > 0 && (
            <View className="mt-3">
              <Text className="text-sm font-semibold text-gray-900 mb-1">Required Skills</Text>
              <View className="flex-row flex-wrap gap-1">
                {job.required_skills.map((skill) => (
                  <View
                    key={skill}
                    style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}
                  >
                    <Text style={{ color: "#374151", fontSize: 12 }}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Budget & Timeline */}
        <View className="bg-white mx-4 mt-3 rounded-xl p-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <View className="flex-row items-center mb-2">
            <Ionicons name="cash-outline" size={18} color="#1B5E20" />
            <Text className="text-sm font-semibold text-gray-900 ml-2">Budget</Text>
          </View>
          <Text className="text-lg font-bold text-green-700 mb-3">
            {formatBudget(job.budget_min, job.budget_max, job.currency)}
          </Text>

          {job.deadline && (
            <View className="flex-row items-center mb-1">
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-2">Deadline: {formatDate(job.deadline)}</Text>
            </View>
          )}
          {job.bid_deadline && (
            <View className="flex-row items-center mb-1">
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-2">Bid Deadline: {formatDate(job.bid_deadline)}</Text>
            </View>
          )}
          {job.bid_count != null && (
            <View className="flex-row items-center">
              <Ionicons name="people-outline" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-2">{job.bid_count} bid{job.bid_count !== 1 ? "s" : ""} received</Text>
            </View>
          )}
        </View>

        {/* Provider: Show existing bid or bid form */}
        {!isHirer && myBid && (
          <View className="bg-white mx-4 mt-3 rounded-xl p-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-900">Your Bid</Text>
              <StatusBadge status={myBid.status} />
            </View>
            <Text className="text-lg font-bold text-green-700 mb-1">J${myBid.amount.toLocaleString()}</Text>
            <Text className="text-sm text-gray-600 mb-1">{myBid.proposal}</Text>
            {myBid.estimated_duration_days && (
              <Text className="text-xs text-gray-500">Duration: {myBid.estimated_duration_days} days</Text>
            )}
            {myBid.hirer_note && (
              <View className="mt-2 bg-blue-50 rounded-lg p-2">
                <Text className="text-xs text-blue-700">Note from hirer: {myBid.hirer_note}</Text>
              </View>
            )}

            {/* Contract navigation if bid accepted */}
            {(myBid.status === "accepted" || myBid.is_winner) && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/jobs/contract",
                    params: { jobId: id },
                  })
                }
                className="mt-3 rounded-lg py-3 items-center"
                style={{ backgroundColor: "#1B5E20" }}
              >
                <Text className="text-white font-semibold">View Contract</Text>
              </Pressable>
            )}
          </View>
        )}

        {canBid && (
          <View className="bg-white mx-4 mt-3 rounded-xl p-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Text className="text-base font-semibold text-gray-900 mb-3">Submit Your Bid</Text>

            <Text className="text-sm font-medium text-gray-700 mb-1">Bid Amount (J$) *</Text>
            <TextInput
              className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
              placeholder="e.g. 25000"
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="numeric"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Proposal *</Text>
            <TextInput
              className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: "#E5E7EB", minHeight: 80 }}
              placeholder="Describe how you'd approach this job..."
              value={bidProposal}
              onChangeText={setBidProposal}
              multiline
              textAlignVertical="top"
            />

            <View className="flex-row mb-3">
              <View className="flex-1 mr-2">
                <Text className="text-sm font-medium text-gray-700 mb-1">Duration (days)</Text>
                <TextInput
                  className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-900"
                  style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
                  placeholder="e.g. 14"
                  value={bidDuration}
                  onChangeText={setBidDuration}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Start Date</Text>
                <TextInput
                  className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-900"
                  style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
                  placeholder="YYYY-MM-DD"
                  value={bidStartDate}
                  onChangeText={setBidStartDate}
                />
              </View>
            </View>

            <Pressable
              onPress={handleSubmitBid}
              className="rounded-lg py-3 items-center"
              style={{ backgroundColor: "#1B5E20" }}
              disabled={submitBidMutation.isPending}
            >
              <Text className="text-white font-semibold text-base">
                {submitBidMutation.isPending ? "Submitting..." : "Submit Bid"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Hirer: Bid List */}
        {isHirer && bids.length > 0 && (
          <View className="mx-4 mt-3">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              Bids ({bids.length})
            </Text>
            {bids.map((bid) => (
              <View
                key={bid.id}
                className="bg-white rounded-xl p-4 mb-3"
                style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="rounded-full items-center justify-center"
                      style={{ width: 36, height: 36, backgroundColor: "#E5E7EB" }}
                    >
                      <Ionicons name="person" size={20} color="#6B7280" />
                    </View>
                    <View className="ml-2 flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        {bid.provider?.display_name || "Provider"}
                      </Text>
                      {bid.provider?.rating != null && (
                        <View className="flex-row items-center">
                          <Ionicons name="star" size={12} color="#FFC107" />
                          <Text className="text-xs text-gray-500 ml-0.5">{bid.provider.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <StatusBadge status={bid.status} />
                </View>

                <Text className="text-lg font-bold text-green-700 mb-1">
                  J${bid.amount.toLocaleString()}
                </Text>
                <Text className="text-sm text-gray-600 mb-2" numberOfLines={3}>
                  {bid.proposal}
                </Text>

                <View className="flex-row items-center mb-2">
                  {bid.estimated_duration_days && (
                    <Text className="text-xs text-gray-500 mr-3">
                      <Ionicons name="time-outline" size={12} color="#6B7280" /> {bid.estimated_duration_days} days
                    </Text>
                  )}
                  {bid.available_start_date && (
                    <Text className="text-xs text-gray-500">
                      <Ionicons name="calendar-outline" size={12} color="#6B7280" /> Start: {formatDate(bid.available_start_date)}
                    </Text>
                  )}
                </View>

                {/* Action buttons for hirer */}
                {bid.status === "submitted" && (
                  <View className="flex-row gap-2 mt-1">
                    <Pressable
                      onPress={() => handleBidAction(bid.id, "shortlisted", "Shortlist")}
                      className="flex-1 rounded-lg py-2.5 items-center"
                      style={{ backgroundColor: "#DBEAFE" }}
                      disabled={bidStatusMutation.isPending}
                    >
                      <Text style={{ color: "#1E40AF", fontWeight: "600", fontSize: 13 }}>Shortlist</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleBidAction(bid.id, "accepted", "Accept")}
                      className="flex-1 rounded-lg py-2.5 items-center"
                      style={{ backgroundColor: "#DCFCE7" }}
                      disabled={bidStatusMutation.isPending}
                    >
                      <Text style={{ color: "#166534", fontWeight: "600", fontSize: 13 }}>Accept</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleBidAction(bid.id, "rejected", "Reject")}
                      className="flex-1 rounded-lg py-2.5 items-center"
                      style={{ backgroundColor: "#FEE2E2" }}
                      disabled={bidStatusMutation.isPending}
                    >
                      <Text style={{ color: "#991B1B", fontWeight: "600", fontSize: 13 }}>Reject</Text>
                    </Pressable>
                  </View>
                )}

                {bid.status === "shortlisted" && (
                  <View className="flex-row gap-2 mt-1">
                    <Pressable
                      onPress={() => handleBidAction(bid.id, "accepted", "Accept")}
                      className="flex-1 rounded-lg py-2.5 items-center"
                      style={{ backgroundColor: "#DCFCE7" }}
                      disabled={bidStatusMutation.isPending}
                    >
                      <Text style={{ color: "#166534", fontWeight: "600", fontSize: 13 }}>Accept</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleBidAction(bid.id, "rejected", "Reject")}
                      className="flex-1 rounded-lg py-2.5 items-center"
                      style={{ backgroundColor: "#FEE2E2" }}
                      disabled={bidStatusMutation.isPending}
                    >
                      <Text style={{ color: "#991B1B", fontWeight: "600", fontSize: 13 }}>Reject</Text>
                    </Pressable>
                  </View>
                )}

                {/* Show contract button if bid accepted */}
                {(bid.status === "accepted" || bid.is_winner) && (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/jobs/contract",
                        params: { jobId: id },
                      })
                    }
                    className="mt-2 rounded-lg py-2.5 items-center"
                    style={{ backgroundColor: "#1B5E20" }}
                  >
                    <Text className="text-white font-semibold text-sm">View Contract</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {isHirer && bids.length === 0 && !loadingBids && (
          <View className="bg-white mx-4 mt-3 rounded-xl p-4 items-center" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Ionicons name="people-outline" size={32} color="#9CA3AF" />
            <Text className="text-sm text-gray-500 mt-2">No bids yet</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
