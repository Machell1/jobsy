import { useState, useCallback } from "react";
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
import { formatDate, formatCurrency } from "@/utils/format";

// ── Types ────────────────────────────────────────────────────────────────

type CampaignStatus = "active" | "paused" | "completed" | "pending_approval";
type CampaignType = "banner" | "featured" | "sponsored";

interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  target_parish: string | null;
  target_category: string | null;
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  creative_url: string | null;
  analytics: CampaignAnalytics | null;
}

interface CampaignAnalytics {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
}

interface BillingEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: string;
}

type TabFilter = "all" | "active" | "paused" | "completed";

// ── Constants ────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES: { label: string; value: CampaignType }[] = [
  { label: "Banner Ad", value: "banner" },
  { label: "Featured Listing", value: "featured" },
  { label: "Sponsored Post", value: "sponsored" },
];

const PARISHES = [
  "Kingston",
  "St. Andrew",
  "St. Thomas",
  "Portland",
  "St. Mary",
  "St. Ann",
  "Trelawny",
  "St. James",
  "Hanover",
  "Westmoreland",
  "St. Elizabeth",
  "Manchester",
  "Clarendon",
  "St. Catherine",
];

// ── Status helpers ───────────────────────────────────────────────────────

function statusColor(status: CampaignStatus): string {
  switch (status) {
    case "active":
      return COLORS.success;
    case "paused":
      return COLORS.warning;
    case "completed":
      return COLORS.gray[500];
    case "pending_approval":
      return COLORS.info;
  }
}

function statusLabel(status: CampaignStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "pending_approval":
      return "Pending Approval";
  }
}

function statusIcon(status: CampaignStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case "active":
      return "checkmark-circle";
    case "paused":
      return "pause-circle";
    case "completed":
      return "flag";
    case "pending_approval":
      return "time";
  }
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

// ── Main Screen ──────────────────────────────────────────────────────────

export default function AdvertiserScreen() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [billing, setBilling] = useState<BillingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  // Create campaign modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<CampaignType>("banner");
  const [formParish, setFormParish] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formBudget, setFormBudget] = useState("");
  const [formDuration, setFormDuration] = useState("7");
  const [formCreativeUri, setFormCreativeUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showParishPicker, setShowParishPicker] = useState(false);

  // Campaign detail modal
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);

  // ── Fetch data ───────────────────────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    try {
      setError(null);
      const [campaignsRes, billingRes] = await Promise.allSettled([
        api.get<Campaign[]>("/api/ads/campaigns"),
        api.get<BillingEntry[]>("/api/ads/billing"),
      ]);

      if (campaignsRes.status === "fulfilled") {
        setCampaigns(campaignsRes.value.data);
      } else {
        setError("Could not load campaigns.");
      }
      if (billingRes.status === "fulfilled") {
        setBilling(billingRes.value.data);
      }
    } catch {
      setError("Could not load advertiser data.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useState(() => {
    fetchCampaigns();
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCampaigns();
  }, [fetchCampaigns]);

  // ── Fetch campaign analytics ─────────────────────────────────────────

  const openCampaignDetail = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setAnalytics(campaign.analytics);
    if (!campaign.analytics) {
      setLoadingAnalytics(true);
      try {
        const { data } = await api.get<CampaignAnalytics>(
          `/api/ads/campaigns/${campaign.id}/analytics`,
        );
        setAnalytics(data);
      } catch {
        // Analytics may not be available
      } finally {
        setLoadingAnalytics(false);
      }
    }
  };

  // ── Filtering ────────────────────────────────────────────────────────

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeTab === "all") return true;
    return c.status === activeTab;
  });

  // ── Create campaign ──────────────────────────────────────────────────

  const handlePickCreative = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setFormCreativeUri(result.assets[0].uri);
    } catch {
      Alert.alert("Error", "Could not open image picker.");
    }
  };

  const handleCreateCampaign = async () => {
    if (!formName.trim()) {
      Alert.alert("Missing Info", "Please enter a campaign name.");
      return;
    }
    if (!formBudget || Number(formBudget) <= 0) {
      Alert.alert("Missing Info", "Please enter a valid budget.");
      return;
    }

    setSubmitting(true);
    try {
      let creativeUrl: string | null = null;
      if (formCreativeUri) {
        const uploaded = await uploadFile(formCreativeUri, "ads/creatives");
        creativeUrl = uploaded.url;
      }

      await api.post("/api/ads/campaigns", {
        name: formName.trim(),
        type: formType,
        target_parish: formParish || null,
        target_category: formCategory || null,
        budget: Number(formBudget),
        duration_days: Number(formDuration) || 7,
        creative_url: creativeUrl,
      });

      resetCreateForm();
      fetchCampaigns();
      Alert.alert("Campaign Created", "Your campaign has been submitted for approval.");
    } catch {
      Alert.alert("Error", "Could not create campaign. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setShowCreateModal(false);
    setFormName("");
    setFormType("banner");
    setFormParish("");
    setFormCategory("");
    setFormBudget("");
    setFormDuration("7");
    setFormCreativeUri(null);
  };

  // ── Tabs ─────────────────────────────────────────────────────────────

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "paused", label: "Paused" },
    { key: "completed", label: "Done" },
  ];

  // ── Aggregate stats ──────────────────────────────────────────────────

  const totalImpressions = campaigns.reduce(
    (sum, c) => sum + (c.analytics?.impressions ?? 0),
    0,
  );
  const totalClicks = campaigns.reduce(
    (sum, c) => sum + (c.analytics?.clicks ?? 0),
    0,
  );
  const totalSpend = campaigns.reduce(
    (sum, c) => sum + (c.analytics?.spend ?? c.spent ?? 0),
    0,
  );
  const avgCtr =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : "0.00";

  // ── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-gray-500 mt-3">Loading campaigns...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Advertiser</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Manage your campaigns
            </Text>
          </View>
          <Pressable
            onPress={() => setShowCreateModal(true)}
            className="bg-green-700 px-4 py-2 rounded-xl flex-row items-center gap-1.5"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white font-semibold text-sm">New Campaign</Text>
          </Pressable>
        </View>

        {/* Tab filters */}
        <View className="flex-row mt-4 gap-2">
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full ${
                activeTab === tab.key ? "bg-green-700" : "bg-gray-100"
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
          <Pressable onPress={fetchCampaigns} className="mt-2">
            <Text className="text-red-600 font-semibold text-sm">Tap to retry</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={filteredCampaigns}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        ListHeaderComponent={
          /* Aggregate stats row */
          campaigns.length > 0 ? (
            <View className="flex-row px-5 pt-4 gap-3">
              {[
                {
                  label: "Impressions",
                  value: formatNumber(totalImpressions),
                  icon: "eye-outline" as keyof typeof Ionicons.glyphMap,
                  color: COLORS.info,
                },
                {
                  label: "Clicks",
                  value: formatNumber(totalClicks),
                  icon: "hand-left-outline" as keyof typeof Ionicons.glyphMap,
                  color: COLORS.primary,
                },
                {
                  label: "CTR",
                  value: `${avgCtr}%`,
                  icon: "trending-up-outline" as keyof typeof Ionicons.glyphMap,
                  color: COLORS.success,
                },
                {
                  label: "Spend",
                  value: formatCurrency(totalSpend),
                  icon: "wallet-outline" as keyof typeof Ionicons.glyphMap,
                  color: COLORS.warning,
                },
              ].map((stat) => (
                <View
                  key={stat.label}
                  className="flex-1 bg-white rounded-xl border border-gray-200 p-3 items-center"
                >
                  <Ionicons name={stat.icon} size={18} color={stat.color} />
                  <Text className="text-base font-bold text-gray-900 mt-1">
                    {stat.value}
                  </Text>
                  <Text className="text-xs text-gray-500">{stat.label}</Text>
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openCampaignDetail(item)}
            className="bg-white rounded-xl border border-gray-200 p-4 mx-5 mt-3"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-base font-semibold text-gray-900">
                  {item.name}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5 capitalize">
                  {item.type.replace("_", " ")}
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
                <Ionicons name="wallet-outline" size={14} color={COLORS.gray[500]} />
                <Text className="text-xs text-gray-500">
                  {formatCurrency(item.budget)} budget
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons name="calendar-outline" size={14} color={COLORS.gray[500]} />
                <Text className="text-xs text-gray-500">
                  {formatDate(item.start_date)} - {formatDate(item.end_date)}
                </Text>
              </View>
            </View>

            {/* Inline analytics preview */}
            {item.analytics && (
              <View className="flex-row mt-3 pt-3 border-t border-gray-100 gap-4">
                <Text className="text-xs text-gray-500">
                  {formatNumber(item.analytics.impressions)} impressions
                </Text>
                <Text className="text-xs text-gray-500">
                  {formatNumber(item.analytics.clicks)} clicks
                </Text>
                <Text className="text-xs text-gray-500">
                  {item.analytics.ctr.toFixed(2)}% CTR
                </Text>
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 pt-16">
            <Ionicons name="megaphone-outline" size={64} color={COLORS.gray[400]} />
            <Text className="mt-4 text-lg font-semibold text-gray-700">
              No campaigns
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-400">
              Create your first advertising campaign to reach Jamaican customers.
            </Text>
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="mt-4 bg-green-700 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Create Campaign</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          billing.length > 0 ? (
            <View className="px-5 mt-6">
              <Text className="text-base font-semibold text-gray-900 mb-3">
                Billing History
              </Text>
              {billing.map((entry) => (
                <View
                  key={entry.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 mb-2 flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800">
                      {entry.description}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {formatDate(entry.date)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-semibold text-gray-900">
                      {formatCurrency(entry.amount)}
                    </Text>
                    <Text
                      className="text-xs capitalize"
                      style={{
                        color:
                          entry.status === "paid" ? COLORS.success : COLORS.warning,
                      }}
                    >
                      {entry.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      {/* ── Campaign Detail Modal ─────────────────────────────────────── */}
      <Modal
        visible={!!selectedCampaign}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCampaign(null)}
      >
        <View className="flex-1 bg-gray-50">
          <View className="bg-white px-5 pt-6 pb-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">Campaign Details</Text>
            <Pressable onPress={() => setSelectedCampaign(null)}>
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </Pressable>
          </View>

          {selectedCampaign && (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            >
              {/* Campaign info */}
              <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <Text className="text-lg font-bold text-gray-900">
                  {selectedCampaign.name}
                </Text>
                <View className="flex-row items-center mt-2 gap-2">
                  <View
                    className="px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: statusColor(selectedCampaign.status) + "20",
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: statusColor(selectedCampaign.status) }}
                    >
                      {statusLabel(selectedCampaign.status)}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500 capitalize">
                    {selectedCampaign.type.replace("_", " ")}
                  </Text>
                </View>

                <View className="mt-4 gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-500">Budget</Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {formatCurrency(selectedCampaign.budget)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-500">Spent</Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {formatCurrency(selectedCampaign.spent)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-500">Duration</Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {formatDate(selectedCampaign.start_date)} -{" "}
                      {formatDate(selectedCampaign.end_date)}
                    </Text>
                  </View>
                  {selectedCampaign.target_parish && (
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-500">Target Parish</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {selectedCampaign.target_parish}
                      </Text>
                    </View>
                  )}
                  {selectedCampaign.target_category && (
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-gray-500">Target Category</Text>
                      <Text className="text-sm font-semibold text-gray-900">
                        {selectedCampaign.target_category}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Analytics */}
              <Text className="text-base font-semibold text-gray-900 mb-3">
                Analytics
              </Text>
              {loadingAnalytics ? (
                <View className="bg-white rounded-xl border border-gray-200 p-8 items-center">
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text className="text-sm text-gray-500 mt-2">
                    Loading analytics...
                  </Text>
                </View>
              ) : analytics ? (
                <View className="flex-row flex-wrap gap-3">
                  {[
                    {
                      label: "Impressions",
                      value: formatNumber(analytics.impressions),
                      icon: "eye-outline" as keyof typeof Ionicons.glyphMap,
                      color: COLORS.info,
                    },
                    {
                      label: "Clicks",
                      value: formatNumber(analytics.clicks),
                      icon: "hand-left-outline" as keyof typeof Ionicons.glyphMap,
                      color: COLORS.primary,
                    },
                    {
                      label: "CTR",
                      value: `${analytics.ctr.toFixed(2)}%`,
                      icon: "trending-up-outline" as keyof typeof Ionicons.glyphMap,
                      color: COLORS.success,
                    },
                    {
                      label: "Total Spend",
                      value: formatCurrency(analytics.spend),
                      icon: "wallet-outline" as keyof typeof Ionicons.glyphMap,
                      color: COLORS.warning,
                    },
                  ].map((stat) => (
                    <View
                      key={stat.label}
                      className="flex-1 bg-white rounded-xl border border-gray-200 p-4 items-center"
                      style={{ minWidth: "45%" }}
                    >
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mb-2"
                        style={{ backgroundColor: stat.color + "15" }}
                      >
                        <Ionicons name={stat.icon} size={20} color={stat.color} />
                      </View>
                      <Text className="text-lg font-bold text-gray-900">
                        {stat.value}
                      </Text>
                      <Text className="text-xs text-gray-500">{stat.label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="bg-white rounded-xl border border-gray-200 p-8 items-center">
                  <Ionicons
                    name="analytics-outline"
                    size={40}
                    color={COLORS.gray[400]}
                  />
                  <Text className="text-sm text-gray-500 mt-2">
                    Analytics will appear once your campaign is active.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ── Create Campaign Modal ─────────────────────────────────────── */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetCreateForm}
      >
        <View className="flex-1 bg-gray-50">
          <View className="bg-white px-5 pt-6 pb-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">
              Create Campaign
            </Text>
            <Pressable onPress={resetCreateForm}>
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Campaign Name <Text className="text-red-400">*</Text>
            </Text>
            <TextInput
              value={formName}
              onChangeText={setFormName}
              placeholder="e.g. Summer Plumbing Promo"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
              placeholderTextColor={COLORS.gray[400]}
            />

            {/* Type */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Campaign Type
            </Text>
            <Pressable
              onPress={() => setShowTypePicker(true)}
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between"
            >
              <Text className="text-sm text-gray-900">
                {CAMPAIGN_TYPES.find((t) => t.value === formType)?.label}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.gray[400]} />
            </Pressable>

            {/* Target Parish */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Target Parish (optional)
            </Text>
            <Pressable
              onPress={() => setShowParishPicker(true)}
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between"
            >
              <Text
                className={`text-sm ${formParish ? "text-gray-900" : "text-gray-400"}`}
              >
                {formParish || "All parishes"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.gray[400]} />
            </Pressable>

            {/* Target Category */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Target Category (optional)
            </Text>
            <TextInput
              value={formCategory}
              onChangeText={setFormCategory}
              placeholder="e.g. Plumbing, Carpentry"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
              placeholderTextColor={COLORS.gray[400]}
            />

            {/* Budget */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Budget (JMD) <Text className="text-red-400">*</Text>
            </Text>
            <TextInput
              value={formBudget}
              onChangeText={(t) => setFormBudget(t.replace(/[^0-9.]/g, ""))}
              placeholder="5000"
              keyboardType="numeric"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
              placeholderTextColor={COLORS.gray[400]}
            />

            {/* Duration */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Duration (days)
            </Text>
            <TextInput
              value={formDuration}
              onChangeText={(t) => setFormDuration(t.replace(/[^0-9]/g, ""))}
              placeholder="7"
              keyboardType="numeric"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
              placeholderTextColor={COLORS.gray[400]}
            />

            {/* Creative upload */}
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Creative / Ad Image
            </Text>
            {formCreativeUri ? (
              <View className="flex-row items-center mb-4 gap-3">
                <View className="w-20 h-20 rounded-xl bg-green-50 items-center justify-center">
                  <Ionicons name="image" size={28} color={COLORS.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-700">Image selected</Text>
                  <Pressable onPress={() => setFormCreativeUri(null)}>
                    <Text className="text-sm text-red-500 font-medium mt-1">
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={handlePickCreative}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 items-center mb-4"
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={32}
                  color={COLORS.gray[400]}
                />
                <Text className="text-sm text-gray-500 mt-2">
                  Tap to upload ad creative
                </Text>
              </Pressable>
            )}

            {/* Submit */}
            <Pressable
              onPress={handleCreateCampaign}
              disabled={submitting}
              className={`py-3.5 rounded-xl items-center mt-2 ${
                submitting ? "bg-gray-300" : "bg-green-700"
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Create Campaign
                </Text>
              )}
            </Pressable>
          </ScrollView>

          {/* Type picker */}
          <Modal
            visible={showTypePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowTypePicker(false)}
          >
            <Pressable
              className="flex-1 bg-black/40"
              onPress={() => setShowTypePicker(false)}
            />
            <View className="bg-white rounded-t-3xl pb-10">
              <View className="px-5 pt-5 pb-3 border-b border-gray-200">
                <Text className="text-base font-bold text-gray-900">
                  Campaign Type
                </Text>
              </View>
              {CAMPAIGN_TYPES.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setFormType(option.value);
                    setShowTypePicker(false);
                  }}
                  className={`px-5 py-4 border-b border-gray-100 flex-row items-center justify-between ${
                    formType === option.value ? "bg-green-50" : ""
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      formType === option.value
                        ? "text-green-700 font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    {option.label}
                  </Text>
                  {formType === option.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </Modal>

          {/* Parish picker */}
          <Modal
            visible={showParishPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowParishPicker(false)}
          >
            <Pressable
              className="flex-1 bg-black/40"
              onPress={() => setShowParishPicker(false)}
            />
            <View className="bg-white rounded-t-3xl pb-10">
              <View className="px-5 pt-5 pb-3 border-b border-gray-200">
                <Text className="text-base font-bold text-gray-900">
                  Target Parish
                </Text>
              </View>
              <ScrollView style={{ maxHeight: 400 }}>
                <Pressable
                  onPress={() => {
                    setFormParish("");
                    setShowParishPicker(false);
                  }}
                  className={`px-5 py-4 border-b border-gray-100 flex-row items-center justify-between ${
                    !formParish ? "bg-green-50" : ""
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      !formParish
                        ? "text-green-700 font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    All Parishes
                  </Text>
                  {!formParish && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </Pressable>
                {PARISHES.map((parish) => (
                  <Pressable
                    key={parish}
                    onPress={() => {
                      setFormParish(parish);
                      setShowParishPicker(false);
                    }}
                    className={`px-5 py-4 border-b border-gray-100 flex-row items-center justify-between ${
                      formParish === parish ? "bg-green-50" : ""
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        formParish === parish
                          ? "text-green-700 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {parish}
                    </Text>
                    {formParish === parish && (
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
