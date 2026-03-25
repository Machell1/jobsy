import { useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WebView } from "react-native-webview";

import { getMyPaymentAccount, setupPaymentAccount, requestPayout, getPayouts } from "@/api/payments";
import { LoadingScreen } from "@/components/LoadingScreen";
import { EmptyState } from "@/components/EmptyState";
import { COLORS } from "@/constants/theme";
import { formatCurrency, formatDate } from "@/utils/format";

interface Payout {
  id: string;
  amount: number;
  currency?: string;
  status: string;
  destination?: string;
  created_at?: string;
  initiated_at?: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  completed: { bg: "#DCFCE7", text: "#166534" },
  pending: { bg: "#FEF9C3", text: "#92400E" },
  failed: { bg: "#FEE2E2", text: "#991B1B" },
  processing: { bg: "#DBEAFE", text: "#1E40AF" },
};

export default function PaymentSetupScreen() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"customer" | "provider">("customer");
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  // Payout state
  const [showPayoutSection, setShowPayoutSection] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");

  const { data: account, isLoading } = useQuery({
    queryKey: ["payment-account"],
    queryFn: getMyPaymentAccount,
    retry: false,
  });

  const { data: payouts = [], isLoading: loadingPayouts } = useQuery({
    queryKey: ["payouts"],
    queryFn: getPayouts,
    enabled: showPayoutSection,
  });

  const setupMutation = useMutation({
    mutationFn: () => setupPaymentAccount({ email, name: name || undefined, account_type: accountType }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payment-account"] });
      if (data.onboarding_url) {
        setOnboardingUrl(data.onboarding_url);
      } else {
        Alert.alert("Success", "Payment account set up successfully");
      }
    },
    onError: () => Alert.alert("Error", "Failed to set up payment account"),
  });

  const payoutMutation = useMutation({
    mutationFn: () => requestPayout(parseFloat(payoutAmount)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      setPayoutAmount("");
      Alert.alert("Success", "Payout request submitted. It will be processed within 2-5 business days.");
    },
    onError: () => Alert.alert("Error", "Failed to request payout. Please ensure your Stripe Connect account is fully set up."),
  });

  const handleRequestPayout = () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      return Alert.alert("Invalid", "Enter a valid payout amount.");
    }
    Alert.alert(
      "Confirm Payout",
      `Request a payout of ${formatCurrency(amount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Request", onPress: () => payoutMutation.mutate() },
      ]
    );
  };

  if (isLoading) return <LoadingScreen />;

  // Show Stripe onboarding WebView
  if (onboardingUrl) {
    return (
      <View className="flex-1">
        <Stack.Screen options={{ title: "Stripe Setup" }} />
        <WebView source={{ uri: onboardingUrl }} className="flex-1" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-dark-50" keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Payment Setup" }} />

      <View className="p-4">
        {/* Current status */}
        {account && (
          <View className="mb-4 rounded-2xl bg-white p-4">
            <Text className="text-sm font-semibold text-dark-700">Current Account</Text>
            <View className="mt-2 flex-row items-center gap-2">
              <Ionicons
                name={account.status === "active" ? "checkmark-circle" : "hourglass"}
                size={20}
                color={account.status === "active" ? COLORS.success : COLORS.warning}
              />
              <Text className="text-sm capitalize text-dark-600">{account.status}</Text>
            </View>
            <Text className="mt-1 text-xs text-dark-400">
              Currency: {account.default_currency} | Customer: {account.has_customer ? "Yes" : "No"} | Provider: {account.has_connect ? "Yes" : "No"}
            </Text>
          </View>
        )}

        {/* Account type */}
        <Text className="mb-2 text-sm font-semibold text-dark-700">Account Type</Text>
        <View className="mb-4 flex-row gap-3">
          <Pressable
            onPress={() => setAccountType("customer")}
            className={`flex-1 items-center rounded-xl border-2 py-3 ${
              accountType === "customer" ? "border-primary-900 bg-primary-50" : "border-dark-200"
            }`}
          >
            <Ionicons name="card" size={24} color={accountType === "customer" ? COLORS.primary : COLORS.gray[500]} />
            <Text className="mt-1 text-sm font-medium">Customer</Text>
            <Text className="text-xs text-dark-400">Pay for services</Text>
          </Pressable>
          <Pressable
            onPress={() => setAccountType("provider")}
            className={`flex-1 items-center rounded-xl border-2 py-3 ${
              accountType === "provider" ? "border-primary-900 bg-primary-50" : "border-dark-200"
            }`}
          >
            <Ionicons name="wallet" size={24} color={accountType === "provider" ? COLORS.primary : COLORS.gray[500]} />
            <Text className="mt-1 text-sm font-medium">Provider</Text>
            <Text className="text-xs text-dark-400">Receive payments</Text>
          </Pressable>
        </View>

        {/* Email */}
        <Text className="mb-1.5 text-sm font-semibold text-dark-700">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          className="mb-4 rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
        />

        {/* Name */}
        <Text className="mb-1.5 text-sm font-semibold text-dark-700">Name (optional)</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          className="mb-6 rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
        />

        <Pressable
          onPress={() => setupMutation.mutate()}
          disabled={setupMutation.isPending || !email}
          className={`items-center rounded-xl py-4 ${
            setupMutation.isPending || !email ? "bg-primary-300" : "bg-primary-900"
          }`}
        >
          <Text className="text-base font-bold text-white">
            {setupMutation.isPending ? "Setting up..." : "Set Up Account"}
          </Text>
        </Pressable>

        {/* Payout Section — only for providers with active Stripe Connect */}
        {account?.has_connect && (
          <View className="mt-8">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text className="text-lg font-bold text-dark-800">Payouts</Text>
              <Pressable onPress={() => setShowPayoutSection(!showPayoutSection)}>
                <Ionicons name={showPayoutSection ? "chevron-up" : "chevron-down"} size={22} color={COLORS.gray[600]} />
              </Pressable>
            </View>

            {showPayoutSection && (
              <>
                {/* Request Payout */}
                <View className="rounded-2xl bg-white p-4 mb-4" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text className="text-sm font-semibold text-dark-700 mb-2">Request Payout</Text>
                  <Text className="text-xs text-dark-400 mb-3">
                    Withdraw your earnings to your connected bank account via Stripe Connect.
                  </Text>
                  <TextInput
                    value={payoutAmount}
                    onChangeText={setPayoutAmount}
                    placeholder="Amount (JMD)"
                    keyboardType="numeric"
                    className="rounded-xl border border-dark-200 bg-dark-50 px-4 py-3 text-base mb-3"
                  />
                  <Pressable
                    onPress={handleRequestPayout}
                    disabled={payoutMutation.isPending}
                    className={`items-center rounded-xl py-3 ${
                      payoutMutation.isPending ? "bg-primary-300" : "bg-primary-900"
                    }`}
                  >
                    <Text className="text-sm font-bold text-white">
                      {payoutMutation.isPending ? "Requesting..." : "Request Payout"}
                    </Text>
                  </Pressable>
                </View>

                {/* Payout History */}
                <Text className="text-sm font-semibold text-dark-700 mb-2">Payout History</Text>
                {loadingPayouts ? (
                  <View className="items-center py-6">
                    <Text className="text-sm text-dark-400">Loading payouts...</Text>
                  </View>
                ) : (Array.isArray(payouts) && payouts.length === 0) ? (
                  <View className="items-center py-6 rounded-xl bg-white" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <Ionicons name="wallet-outline" size={32} color="#9CA3AF" />
                    <Text className="text-sm text-dark-400 mt-2">No payouts yet</Text>
                  </View>
                ) : (
                  (Array.isArray(payouts) ? payouts : []).map((payout: Payout) => {
                    const sc = statusColors[payout.status] || { bg: "#F3F4F6", text: "#374151" };
                    return (
                      <View
                        key={payout.id}
                        className="rounded-xl bg-white p-4 mb-2"
                        style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                      >
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-base font-semibold text-dark-800">
                            {formatCurrency(payout.amount, payout.currency || 'JMD')}
                          </Text>
                          <View style={{ backgroundColor: sc.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                            <Text style={{ color: sc.text, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>
                              {payout.status}
                            </Text>
                          </View>
                        </View>
                        {payout.destination && (
                          <Text className="text-xs text-dark-400">{payout.destination}</Text>
                        )}
                        <Text className="text-xs text-dark-400 mt-1">
                          {formatDate((payout.created_at || payout.initiated_at) ?? "")}
                        </Text>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
