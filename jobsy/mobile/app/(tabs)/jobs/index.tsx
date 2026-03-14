import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  getJobPosts,
  getMyPosts,
  getMyBids,
  getContracts,
  createJobPost,
  updateJobPost,
  deleteJobPost,
  updateBidStatus,
  getBiddingStats,
  type JobPost,
  type Bid,
  type Contract,
} from "@/api/bidding";
import { useAuthStore } from "@/stores/auth";
import { PhotoUploader } from "@/components/PhotoUploader";

// ========== Constants ==========

const TABS = ["Browse", "My Posts", "My Bids", "Contracts"] as const;
type TabName = (typeof TABS)[number];

const CATEGORIES = [
  "All",
  "Home Services",
  "Beauty & Wellness",
  "Technology",
  "Education",
  "Events",
  "Health",
  "Auto",
  "Legal",
  "Financial",
  "Creative",
  "Other",
];

const PARISHES = [
  "All",
  "Kingston",
  "St. Andrew",
  "St. Catherine",
  "Clarendon",
  "Manchester",
  "St. Elizabeth",
  "Westmoreland",
  "Hanover",
  "St. James",
  "Trelawny",
  "St. Ann",
  "St. Mary",
  "Portland",
  "St. Thomas",
];

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
  hirer_signed: { bg: "#DBEAFE", text: "#1E40AF" },
  provider_signed: { bg: "#DBEAFE", text: "#1E40AF" },
  active: { bg: "#F3E8FF", text: "#6B21A8" },
  terminated: { bg: "#FEE2E2", text: "#991B1B" },
  disputed: { bg: "#FEF3C7", text: "#92400E" },
};

// ========== Components ==========

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || { bg: "#F3F4F6", text: "#374151" };
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <View
      className="flex-1 bg-white rounded-xl p-3 mr-2"
      style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
    >
      <Text className="text-xs text-gray-500 mb-1">{title}</Text>
      <Text style={{ color, fontSize: 20, fontWeight: "700" }}>{value}</Text>
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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ========== Main Screen ==========

export default function JobBoardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [activeTab, setActiveTab] = useState<TabName>("Browse");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedParish, setSelectedParish] = useState("All");
  const [showPostModal, setShowPostModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Post Job form state
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postCategory, setPostCategory] = useState("Home Services");
  const [postParish, setPostParish] = useState("");
  const [postBudgetMin, setPostBudgetMin] = useState("");
  const [postBudgetMax, setPostBudgetMax] = useState("");
  const [postDeadline, setPostDeadline] = useState("");
  const [postImages, setPostImages] = useState<string[]>([]);

  // Edit Job form state
  const [editingJob, setEditingJob] = useState<JobPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBudgetMin, setEditBudgetMin] = useState('');
  const [editBudgetMax, setEditBudgetMax] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editBidDeadline, setEditBidDeadline] = useState('');

  // Queries
  const browseParams: Record<string, string> = { status: "open" };
  if (selectedCategory !== "All") browseParams.category = selectedCategory;
  if (selectedParish !== "All") browseParams.parish = selectedParish;

  const {
    data: jobPosts = [],
    isLoading: loadingBrowse,
    refetch: refetchBrowse,
  } = useQuery({
    queryKey: ["jobPosts", browseParams],
    queryFn: () => getJobPosts(browseParams),
    enabled: isAuthenticated && activeTab === "Browse",
  });

  const {
    data: myPosts = [],
    isLoading: loadingMyPosts,
    refetch: refetchMyPosts,
  } = useQuery({
    queryKey: ["myJobPosts"],
    queryFn: getMyPosts,
    enabled: isAuthenticated && activeTab === "My Posts",
  });

  const {
    data: myBids = [],
    isLoading: loadingMyBids,
    refetch: refetchMyBids,
  } = useQuery({
    queryKey: ["myBids"],
    queryFn: getMyBids,
    enabled: isAuthenticated && activeTab === "My Bids",
  });

  const {
    data: contracts = [],
    isLoading: loadingContracts,
    refetch: refetchContracts,
  } = useQuery({
    queryKey: ["contracts"],
    queryFn: getContracts,
    enabled: isAuthenticated && activeTab === "Contracts",
  });

  const { data: stats } = useQuery({
    queryKey: ["biddingStats"],
    queryFn: getBiddingStats,
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: createJobPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobPosts"] });
      queryClient.invalidateQueries({ queryKey: ["myJobPosts"] });
      queryClient.invalidateQueries({ queryKey: ["biddingStats"] });
      setShowPostModal(false);
      resetPostForm();
      Alert.alert("Success", "Job posted successfully!");
    },
    onError: () => Alert.alert("Error", "Failed to create job post. Please try again."),
  });

  const editJobMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateJobPost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      queryClient.invalidateQueries({ queryKey: ['job-posts'] });
      setEditingJob(null);
      Alert.alert('Success', 'Job post updated');
    },
    onError: () => Alert.alert('Error', 'Failed to update job post'),
  });

  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => deleteJobPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      queryClient.invalidateQueries({ queryKey: ['job-posts'] });
      Alert.alert('Deleted', 'Job post has been cancelled');
    },
    onError: () => Alert.alert('Error', 'Failed to delete job post'),
  });

  const withdrawBidMutation = useMutation({
    mutationFn: ({ jobId, bidId }: { jobId: string; bidId: string }) => updateBidStatus(jobId, bidId, { status: 'withdrawn' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bids'] });
      Alert.alert('Withdrawn', 'Your bid has been withdrawn');
    },
    onError: () => Alert.alert('Error', 'Failed to withdraw bid'),
  });

  function resetPostForm() {
    setPostTitle("");
    setPostDescription("");
    setPostCategory("Home Services");
    setPostParish("");
    setPostBudgetMin("");
    setPostBudgetMax("");
    setPostDeadline("");
    setPostImages([]);
  }

  function handlePostJob() {
    if (!postTitle.trim() || !postDescription.trim()) {
      Alert.alert("Required", "Please fill in title and description.");
      return;
    }
    createMutation.mutate({
      title: postTitle.trim(),
      description: postDescription.trim(),
      category: postCategory,
      parish: postParish || undefined,
      budget_min: postBudgetMin ? Number(postBudgetMin) : undefined,
      budget_max: postBudgetMax ? Number(postBudgetMax) : undefined,
      currency: "JMD",
      deadline: postDeadline || undefined,
      attachments: postImages.length > 0 ? postImages : undefined,
    });
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === "Browse") await refetchBrowse();
    else if (activeTab === "My Posts") await refetchMyPosts();
    else if (activeTab === "My Bids") await refetchMyBids();
    else if (activeTab === "Contracts") await refetchContracts();
    setRefreshing(false);
  }, [activeTab, refetchBrowse, refetchMyPosts, refetchMyBids, refetchContracts]);

  const isLoading =
    (activeTab === "Browse" && loadingBrowse) ||
    (activeTab === "My Posts" && loadingMyPosts) ||
    (activeTab === "My Bids" && loadingMyBids) ||
    (activeTab === "Contracts" && loadingContracts);

  // ========== Render Helpers ==========

  function renderJobCard({ item }: { item: JobPost }) {
    return (
      <Pressable
        className="bg-white mx-4 mb-3 rounded-xl p-4"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
        onPress={() => router.push(`/(tabs)/jobs/${item.id}`)}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>
            {item.title}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <View className="flex-row items-center mb-2 flex-wrap gap-1">
          <View style={{ backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
            <Text style={{ color: "#4338CA", fontSize: 11, fontWeight: "600" }}>{item.category}</Text>
          </View>
          {item.parish && (
            <View className="flex-row items-center ml-2">
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text className="text-xs text-gray-500 ml-0.5">{item.parish}</Text>
            </View>
          )}
        </View>

        {item.description ? (
          <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {item.attachments && item.attachments.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            {item.attachments.map((url, idx) => (
              <Image
                key={idx}
                source={{ uri: url }}
                style={{ width: 80, height: 60, borderRadius: 8, marginRight: 6 }}
              />
            ))}
          </ScrollView>
        )}

        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-green-700">
            {formatBudget(item.budget_min, item.budget_max, item.currency)}
          </Text>
          <View className="flex-row items-center">
            {item.bid_count != null && (
              <View className="flex-row items-center mr-3">
                <Ionicons name="people-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-500 ml-1">{item.bid_count} bids</Text>
              </View>
            )}
            {item.deadline && (
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-500 ml-1">{formatDate(item.deadline)}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  function renderMyPostCard({ item }: { item: JobPost }) {
    return (
      <Pressable
        className="bg-white mx-4 mb-3 rounded-xl p-4"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
        onPress={() => router.push(`/(tabs)/jobs/${item.id}`)}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>
            {item.title}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <View className="flex-row items-center mb-2 flex-wrap gap-1">
          <View style={{ backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
            <Text style={{ color: "#4338CA", fontSize: 11, fontWeight: "600" }}>{item.category}</Text>
          </View>
          {item.parish && (
            <View className="flex-row items-center ml-2">
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text className="text-xs text-gray-500 ml-0.5">{item.parish}</Text>
            </View>
          )}
        </View>

        {item.description ? (
          <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {item.attachments && item.attachments.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            {item.attachments.map((url, idx) => (
              <Image
                key={idx}
                source={{ uri: url }}
                style={{ width: 80, height: 60, borderRadius: 8, marginRight: 6 }}
              />
            ))}
          </ScrollView>
        )}

        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-green-700">
            {formatBudget(item.budget_min, item.budget_max, item.currency)}
          </Text>
          <View className="flex-row items-center">
            {item.bid_count != null && (
              <View className="flex-row items-center mr-3">
                <Ionicons name="people-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-500 ml-1">{item.bid_count} bids</Text>
              </View>
            )}
            {item.deadline && (
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-500 ml-1">{formatDate(item.deadline)}</Text>
              </View>
            )}
          </View>
        </View>

        {item.status === 'open' && (
          <View className="flex-row mt-3 gap-2">
            <Pressable
              onPress={() => {
                setEditingJob(item);
                setEditTitle(item.title);
                setEditDescription(item.description || '');
                setEditBudgetMin(item.budget_min != null ? String(item.budget_min) : '');
                setEditBudgetMax(item.budget_max != null ? String(item.budget_max) : '');
                setEditDeadline(item.deadline || '');
                setEditBidDeadline((item as unknown as Record<string, unknown>).bid_deadline as string || '');
              }}
              className="flex-1 flex-row items-center justify-center rounded-lg py-2"
              style={{ backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#4338CA' }}
            >
              <Ionicons name="create-outline" size={16} color="#4338CA" />
              <Text style={{ color: '#4338CA', fontWeight: '600', fontSize: 13, marginLeft: 4 }}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert('Delete Job Post', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteJobMutation.mutate(item.id),
                  },
                ])
              }
              className="flex-1 flex-row items-center justify-center rounded-lg py-2"
              style={{ backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#991B1B' }}
              disabled={deleteJobMutation.isPending}
            >
              <Ionicons name="trash-outline" size={16} color="#991B1B" />
              <Text style={{ color: '#991B1B', fontWeight: '600', fontSize: 13, marginLeft: 4 }}>Delete</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  }

  function renderBidCard({ item }: { item: Bid }) {
    return (
      <Pressable
        className="bg-white mx-4 mb-3 rounded-xl p-4"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
        onPress={() => router.push(`/(tabs)/jobs/${item.job_post_id}`)}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>
            {item.job_post?.title || "Job Post"}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
          {item.proposal}
        </Text>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-green-700">
            J${item.amount.toLocaleString()}
          </Text>
          {item.estimated_duration_days && (
            <Text className="text-xs text-gray-500">{item.estimated_duration_days} days</Text>
          )}
          <Text className="text-xs text-gray-400">{formatDate(item.created_at)}</Text>
        </View>

        {item.status === 'submitted' && (
          <Pressable
            onPress={() =>
              Alert.alert('Withdraw Bid', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Withdraw',
                  style: 'destructive',
                  onPress: () => withdrawBidMutation.mutate({ jobId: item.job_post_id, bidId: item.id }),
                },
              ])
            }
            className="mt-3 flex-row items-center justify-center rounded-lg py-2"
            style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#92400E' }}
            disabled={withdrawBidMutation.isPending}
          >
            <Ionicons name="close-circle-outline" size={16} color="#92400E" />
            <Text style={{ color: '#92400E', fontWeight: '600', fontSize: 13, marginLeft: 4 }}>Withdraw</Text>
          </Pressable>
        )}
      </Pressable>
    );
  }

  function renderContractCard({ item }: { item: Contract }) {
    return (
      <Pressable
        className="bg-white mx-4 mb-3 rounded-xl p-4"
        style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/jobs/contract",
            params: { contractId: item.id },
          })
        }
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>
            {item.title}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
          {item.scope_of_work}
        </Text>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-green-700">
            J${item.agreed_amount.toLocaleString()}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="document-text-outline" size={14} color="#6B7280" />
            <Text className="text-xs text-gray-500 ml-1">
              {item.signatures?.length || 0} signature{item.signatures?.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  function renderEmptyState(icon: string, title: string, subtitle: string) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <Ionicons name={icon as React.ComponentProps<typeof Ionicons>["name"]} size={48} color="#9CA3AF" />
        <Text className="text-base text-gray-500 mt-3 font-medium">{title}</Text>
        <Text className="text-sm text-gray-400 mt-1">{subtitle}</Text>
      </View>
    );
  }

  // ========== Loading State ==========

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="lock-closed-outline" size={48} color="#9CA3AF" />
        <Text className="text-base text-gray-500 mt-3 font-medium">Sign in to view the Job Board</Text>
      </View>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Stats Cards */}
      <View className="flex-row px-4 pt-3 pb-2">
        <StatCard title="Open Jobs" value={stats?.active_posts ?? 0} color="#1B5E20" />
        <StatCard title="My Bids" value={stats?.total_bids_submitted ?? 0} color="#1E40AF" />
        <StatCard title="Contracts" value={stats?.contracts_signed ?? 0} color="#166534" />
        <View
          className="flex-1 bg-white rounded-xl p-3"
          style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}
        >
          <Text className="text-xs text-gray-500 mb-1">Won</Text>
          <Text style={{ color: "#6B21A8", fontSize: 20, fontWeight: "700" }}>{stats?.bids_won ?? 0}</Text>
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
            style={{ backgroundColor: activeTab === tab ? "#1B5E20" : "#F3F4F6" }}
          >
            <Text style={{ color: activeTab === tab ? "#FFFFFF" : "#374151", fontSize: 13, fontWeight: "600" }}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Browse Filters */}
      {activeTab === "Browse" && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
          >
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                className="mr-2 rounded-full px-3 py-1.5"
                style={{
                  backgroundColor: selectedCategory === cat ? "#EEF2FF" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: selectedCategory === cat ? "#4338CA" : "#E5E7EB",
                }}
              >
                <Text
                  style={{
                    color: selectedCategory === cat ? "#4338CA" : "#6B7280",
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}
          >
            {PARISHES.map((p) => (
              <Pressable
                key={p}
                onPress={() => setSelectedParish(p)}
                className="mr-2 rounded-full px-3 py-1.5"
                style={{
                  backgroundColor: selectedParish === p ? "#F0FDF4" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: selectedParish === p ? "#166534" : "#E5E7EB",
                }}
              >
                <Text
                  style={{
                    color: selectedParish === p ? "#166534" : "#6B7280",
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  {p}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {/* Content Lists */}
      {activeTab === "Browse" && (
        <FlatList
          data={jobPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderJobCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E20" />}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 80, flexGrow: 1 }}
          ListEmptyComponent={renderEmptyState(
            "briefcase-outline",
            "No jobs found",
            "Try different filters or check back later",
          )}
        />
      )}

      {activeTab === "My Posts" && (
        <FlatList
          data={myPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderMyPostCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E20" />}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 80, flexGrow: 1 }}
          ListEmptyComponent={renderEmptyState(
            "create-outline",
            "No job posts yet",
            "Post a job to find the right provider",
          )}
        />
      )}

      {activeTab === "My Bids" && (
        <FlatList
          data={myBids}
          keyExtractor={(item) => item.id}
          renderItem={renderBidCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E20" />}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 20, flexGrow: 1 }}
          ListEmptyComponent={renderEmptyState(
            "hand-left-outline",
            "No bids yet",
            "Browse jobs and submit your first bid",
          )}
        />
      )}

      {activeTab === "Contracts" && (
        <FlatList
          data={contracts}
          keyExtractor={(item) => item.id}
          renderItem={renderContractCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B5E20" />}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 20, flexGrow: 1 }}
          ListEmptyComponent={renderEmptyState(
            "document-text-outline",
            "No contracts yet",
            "Contracts appear when bids are accepted",
          )}
        />
      )}

      {/* FAB - Post a Job */}
      {(activeTab === "Browse" || activeTab === "My Posts") && (
        <Pressable
          onPress={() => setShowPostModal(true)}
          className="absolute bottom-6 right-6 rounded-full items-center justify-center"
          style={{
            width: 56,
            height: 56,
            backgroundColor: "#1B5E20",
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Edit Job Modal */}
      <Modal visible={!!editingJob} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingJob(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900">Edit Job Post</Text>
              <Pressable onPress={() => setEditingJob(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-medium text-gray-700 mb-1">Title</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="Job title"
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB', minHeight: 80 }}
                placeholder="Describe the job..."
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                textAlignVertical="top"
              />

              <View className="flex-row mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Budget Min (J$)</Text>
                  <TextInput
                    className="bg-white rounded-lg px-3 py-2.5 text-sm text-gray-900"
                    style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                    placeholder="5,000"
                    value={editBudgetMin}
                    onChangeText={setEditBudgetMin}
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Budget Max (J$)</Text>
                  <TextInput
                    className="bg-white rounded-lg px-3 py-2.5 text-sm text-gray-900"
                    style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                    placeholder="50,000"
                    value={editBudgetMax}
                    onChangeText={setEditBudgetMax}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-1">Deadline (YYYY-MM-DD)</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="2026-04-01"
                value={editDeadline}
                onChangeText={setEditDeadline}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Bid Deadline (YYYY-MM-DD)</Text>
              <TextInput
                className="bg-white rounded-lg px-3 py-2.5 mb-4 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                placeholder="2026-03-25"
                value={editBidDeadline}
                onChangeText={setEditBidDeadline}
              />

              <Pressable
                onPress={() => {
                  if (!editingJob) return;
                  editJobMutation.mutate({
                    id: editingJob.id,
                    data: {
                      title: editTitle.trim(),
                      description: editDescription.trim(),
                      budget_min: editBudgetMin ? Number(editBudgetMin) : undefined,
                      budget_max: editBudgetMax ? Number(editBudgetMax) : undefined,
                      deadline: editDeadline || undefined,
                      bid_deadline: editBidDeadline || undefined,
                    },
                  });
                }}
                className="rounded-lg py-3 items-center mb-8"
                style={{ backgroundColor: '#1B5E20' }}
                disabled={editJobMutation.isPending}
              >
                <Text className="text-white font-semibold text-base">
                  {editJobMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Post Job Modal */}
      <Modal visible={showPostModal} transparent animationType="slide" onRequestClose={() => setShowPostModal(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowPostModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Pressable className="bg-white rounded-t-2xl p-5 pb-10" onPress={(e) => e.stopPropagation()}>
              <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />
              <Text className="text-lg font-bold text-gray-900 mb-4">Post a Job</Text>

              <Text className="text-sm font-medium text-gray-700 mb-1">Title *</Text>
              <TextInput
                className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
                placeholder="e.g. Need a plumber for kitchen repair"
                value={postTitle}
                onChangeText={setPostTitle}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Description *</Text>
              <TextInput
                className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: "#E5E7EB", minHeight: 80 }}
                placeholder="Describe the job in detail..."
                value={postDescription}
                onChangeText={setPostDescription}
                multiline
                textAlignVertical="top"
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {CATEGORIES.filter((c) => c !== "All").map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setPostCategory(cat)}
                    className="mr-2 rounded-full px-3 py-1.5"
                    style={{
                      backgroundColor: postCategory === cat ? "#1B5E20" : "#F3F4F6",
                    }}
                  >
                    <Text
                      style={{
                        color: postCategory === cat ? "#FFFFFF" : "#374151",
                        fontSize: 12,
                        fontWeight: "500",
                      }}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text className="text-sm font-medium text-gray-700 mb-1">Parish</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {PARISHES.filter((p) => p !== "All").map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPostParish(p)}
                    className="mr-2 rounded-full px-3 py-1.5"
                    style={{
                      backgroundColor: postParish === p ? "#1B5E20" : "#F3F4F6",
                    }}
                  >
                    <Text
                      style={{
                        color: postParish === p ? "#FFFFFF" : "#374151",
                        fontSize: 12,
                        fontWeight: "500",
                      }}
                    >
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View className="flex-row mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Budget Min (J$)</Text>
                  <TextInput
                    className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-900"
                    style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
                    placeholder="5,000"
                    value={postBudgetMin}
                    onChangeText={setPostBudgetMin}
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Budget Max (J$)</Text>
                  <TextInput
                    className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-900"
                    style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
                    placeholder="50,000"
                    value={postBudgetMax}
                    onChangeText={setPostBudgetMax}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-1">Deadline (YYYY-MM-DD)</Text>
              <TextInput
                className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
                style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
                placeholder="2026-04-01"
                value={postDeadline}
                onChangeText={setPostDeadline}
              />

              <Text className="text-sm font-medium text-gray-700 mb-1">Images (up to 5)</Text>
              <PhotoUploader
                photos={postImages}
                onChange={setPostImages}
                maxPhotos={5}
                bucket="jobs"
              />

              <Pressable
                onPress={handlePostJob}
                className="rounded-lg py-3 items-center mt-2"
                style={{ backgroundColor: "#1B5E20" }}
                disabled={createMutation.isPending}
              >
                <Text className="text-white font-semibold text-base">
                  {createMutation.isPending ? "Posting..." : "Post Job"}
                </Text>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}
