import React from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";

// ── Types ────────────────────────────────────────────────────────────────

interface LegalPage {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  url: string;
}

// ── Data ─────────────────────────────────────────────────────────────────

const LEGAL_PAGES: LegalPage[] = [
  {
    title: "Privacy Policy",
    subtitle: "How we collect, use, and protect your data",
    icon: "shield-checkmark-outline",
    url: "https://jobsyja.com/#/privacy-policy",
  },
  {
    title: "Terms of Service",
    subtitle: "Rules and conditions for using Jobsy",
    icon: "document-text-outline",
    url: "https://jobsyja.com/#/terms-of-service",
  },
  {
    title: "Refund Policy",
    subtitle: "Our guidelines for refunds and cancellations",
    icon: "cash-outline",
    url: "https://jobsyja.com/#/refund-policy",
  },
  {
    title: "Community Guidelines",
    subtitle: "Standards of conduct for all users",
    icon: "people-outline",
    url: "https://jobsyja.com/#/community-guidelines",
  },
  {
    title: "Advertiser Terms",
    subtitle: "Terms and conditions for advertisers",
    icon: "megaphone-outline",
    url: "https://jobsyja.com/#/advertiser-terms",
  },
  {
    title: "Contract Terms",
    subtitle: "Terms governing contracts between users",
    icon: "create-outline",
    url: "https://jobsyja.com/#/contract-terms",
  },
  {
    title: "About Jobsy",
    subtitle: "Learn more about our mission and team",
    icon: "information-circle-outline",
    url: "https://jobsyja.com/#/about",
  },
  {
    title: "Contact Us",
    subtitle: "Get in touch with our support team",
    icon: "mail-outline",
    url: "https://jobsyja.com/#/contact",
  },
];

// ── Main Screen ──────────────────────────────────────────────────────────

export default function LegalScreen() {
  const handleOpenPage = async (page: LegalPage) => {
    try {
      const canOpen = await Linking.canOpenURL(page.url);
      if (canOpen) {
        await Linking.openURL(page.url);
      }
    } catch {
      // silently fail
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">
          Legal & Info
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          Review our policies and learn more about Jobsy
        </Text>
      </View>

      {/* Pages List */}
      <View className="mx-5 mt-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
        {LEGAL_PAGES.map((page, index) => (
          <Pressable
            key={page.url}
            onPress={() => handleOpenPage(page)}
            className={`flex-row items-center px-4 py-4 ${
              index < LEGAL_PAGES.length - 1 ? "border-b border-gray-100" : ""
            }`}
            style={({ pressed }) => ({
              backgroundColor: pressed ? COLORS.gray[100] : "transparent",
            })}
          >
            <View
              className="h-10 w-10 rounded-full items-center justify-center"
              style={{ backgroundColor: `${COLORS.primary}10` }}
            >
              <Ionicons name={page.icon} size={20} color={COLORS.primary} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-gray-900">
                {page.title}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {page.subtitle}
              </Text>
            </View>
            <Ionicons
              name="open-outline"
              size={18}
              color={COLORS.gray[400]}
            />
          </Pressable>
        ))}
      </View>

      {/* Footer */}
      <View className="mx-5 mt-6 items-center">
        <View className="flex-row items-center mb-2">
          <Ionicons name="leaf" size={16} color={COLORS.primary} />
          <Text className="text-sm font-bold text-green-800 ml-1">Jobsy</Text>
        </View>
        <Text className="text-xs text-gray-400 text-center">
          Jamaica's Service Marketplace
        </Text>
        <Text className="text-xs text-gray-300 mt-1">
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
