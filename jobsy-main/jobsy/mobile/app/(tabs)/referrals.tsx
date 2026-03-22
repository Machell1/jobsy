import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { COLORS } from "@/constants/theme";

// ── Types ────────────────────────────────────────────────────────────────

interface ReferralStats {
  total_referrals: number;
  successful_signups: number;
  rewards_earned: number;
  referral_code: string;
  referral_link: string;
}

interface ReferralEntry {
  id: string;
  referred_name: string;
  referred_avatar_url: string | null;
  signed_up_at: string;
  reward_status: "pending" | "credited" | "expired";
  reward_amount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function rewardStatusColor(status: ReferralEntry["reward_status"]): string {
  switch (status) {
    case "credited":
      return COLORS.success;
    case "pending":
      return COLORS.warning;
    case "expired":
      return COLORS.gray[500];
    default:
      return COLORS.gray[500];
  }
}

function rewardStatusLabel(status: ReferralEntry["reward_status"]): string {
  switch (status) {
    case "credited":
      return "Credited";
    case "pending":
      return "Pending";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

// ── Main Screen ──────────────────────────────────────────────────────────

export default function ReferralsScreen() {
  const user = useAuthStore((s) => s.user);

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Data Fetching ────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, referralsRes] = await Promise.all([
        api.get<ReferralStats>("/api/referrals/stats"),
        api.get<ReferralEntry[]>("/api/referrals"),
      ]);
      setStats(statsRes.data);
      setReferrals(referralsRes.data);
    } catch {
      setError("Failed to load referral data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Fetch on mount
  useEffect(() => {
    fetchData();
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────

  const handleCopyCode = async () => {
    if (!stats?.referral_code) return;
    await Clipboard.setStringAsync(stats.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!stats?.referral_link) return;
    try {
      await Share.share({
        message: `Join Jobsy using my referral link and we both earn rewards! ${stats.referral_link}`,
        url: stats.referral_link,
      });
    } catch {
      // user cancelled
    }
  };

  // ── Render: Loading / Error ──────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-gray-500 mt-3">Loading referrals...</Text>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.gray[400]} />
        <Text className="mt-4 text-lg font-semibold text-gray-700">
          {error || "Could not load referral data"}
        </Text>
        <Pressable
          onPress={fetchData}
          className="mt-4 px-6 py-3 rounded-xl"
          style={{ backgroundColor: COLORS.primary }}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ── Stat cards ───────────────────────────────────────────────────────

  const statCards: {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
  }[] = [
    {
      label: "Total Referrals",
      value: stats.total_referrals.toLocaleString(),
      icon: "people",
      color: COLORS.info,
    },
    {
      label: "Signups",
      value: stats.successful_signups.toLocaleString(),
      icon: "person-add",
      color: COLORS.success,
    },
    {
      label: "Rewards Earned",
      value: `J$${stats.rewards_earned.toLocaleString()}`,
      icon: "gift",
      color: COLORS.primary,
    },
  ];

  // ── Render: Main ─────────────────────────────────────────────────────

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
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">
          Referral Program
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          Invite friends and earn rewards together
        </Text>
      </View>

      {/* Referral Code Card */}
      <View
        className="mx-5 mt-3 p-5 rounded-2xl border border-green-200"
        style={{ backgroundColor: "#F0FDF4" }}
      >
        <Text className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2">
          Your Referral Code
        </Text>
        <View className="flex-row items-center justify-between bg-white rounded-xl border border-green-300 px-4 py-3">
          <Text
            className="text-xl font-bold tracking-widest"
            style={{ color: COLORS.primary }}
          >
            {stats.referral_code}
          </Text>
          <Pressable
            onPress={handleCopyCode}
            className="flex-row items-center px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: copied ? "#DCFCE7" : `${COLORS.primary}15` }}
          >
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={16}
              color={COLORS.primary}
            />
            <Text className="text-xs font-semibold text-green-700 ml-1">
              {copied ? "Copied!" : "Copy"}
            </Text>
          </Pressable>
        </View>

        {/* Share Button */}
        <Pressable
          onPress={handleShare}
          className="mt-4 flex-row items-center justify-center py-3.5 rounded-xl"
          style={{ backgroundColor: COLORS.primary }}
        >
          <Ionicons name="share-social" size={18} color="white" />
          <Text className="text-white font-semibold text-base ml-2">
            Share Referral Link
          </Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View className="flex-row px-4 mt-4">
        {statCards.map((stat) => (
          <View key={stat.label} className="flex-1 px-1">
            <View className="bg-white rounded-xl p-3 border border-gray-100 items-center">
              <View
                className="h-9 w-9 rounded-full items-center justify-center mb-2"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <Ionicons name={stat.icon} size={18} color={stat.color} />
              </View>
              <Text className="text-lg font-bold text-gray-900">
                {stat.value}
              </Text>
              <Text className="text-xs text-gray-500 text-center mt-0.5">
                {stat.label}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* How It Works */}
      <View className="mx-5 mt-4 bg-white rounded-xl p-5 border border-gray-100">
        <View className="flex-row items-center mb-4">
          <Ionicons
            name="information-circle"
            size={18}
            color={COLORS.primary}
          />
          <Text className="text-base font-semibold text-gray-900 ml-2">
            How It Works
          </Text>
        </View>

        {[
          {
            step: "1",
            title: "Share Your Code",
            desc: "Send your unique referral code or link to friends, family, or anyone in Jamaica.",
            icon: "share-social-outline" as keyof typeof Ionicons.glyphMap,
          },
          {
            step: "2",
            title: "They Sign Up",
            desc: "When someone signs up using your referral code, they get a welcome bonus.",
            icon: "person-add-outline" as keyof typeof Ionicons.glyphMap,
          },
          {
            step: "3",
            title: "You Both Earn",
            desc: "Once they complete their first transaction, you both receive referral rewards.",
            icon: "gift-outline" as keyof typeof Ionicons.glyphMap,
          },
        ].map((item) => (
          <View key={item.step} className="flex-row mb-4 last:mb-0">
            <View
              className="h-8 w-8 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: `${COLORS.primary}15` }}
            >
              <Text
                className="text-sm font-bold"
                style={{ color: COLORS.primary }}
              >
                {item.step}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">
                {item.title}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5 leading-4">
                {item.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Referral History */}
      <View className="mx-5 mt-4">
        <Text className="text-base font-semibold text-gray-900 mb-3">
          Referral History
        </Text>

        {referrals.length === 0 ? (
          <View className="bg-white rounded-xl p-8 border border-gray-100 items-center">
            <Ionicons
              name="people-outline"
              size={40}
              color={COLORS.gray[300]}
            />
            <Text className="text-sm text-gray-400 mt-3 text-center">
              No referrals yet. Share your code to get started!
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {referrals.map((entry) => (
              <View
                key={entry.id}
                className="bg-white rounded-xl p-4 border border-gray-100 flex-row items-center"
              >
                <View className="h-10 w-10 rounded-full bg-gray-200 items-center justify-center">
                  <Ionicons
                    name="person"
                    size={20}
                    color={COLORS.gray[500]}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-gray-900">
                    {entry.referred_name}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Signed up {formatDate(entry.signed_up_at)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className="text-sm font-bold"
                    style={{
                      color: rewardStatusColor(entry.reward_status),
                    }}
                  >
                    {entry.reward_amount > 0
                      ? `J$${entry.reward_amount.toLocaleString()}`
                      : "--"}
                  </Text>
                  <View
                    className="px-2 py-0.5 rounded-full mt-1"
                    style={{
                      backgroundColor: `${rewardStatusColor(entry.reward_status)}15`,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: rewardStatusColor(entry.reward_status),
                      }}
                    >
                      {rewardStatusLabel(entry.reward_status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
