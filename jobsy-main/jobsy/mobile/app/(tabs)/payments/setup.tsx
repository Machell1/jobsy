import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WebView, type WebViewNavigation } from "react-native-webview";

import { getMyPaymentAccount, setupPaymentAccount } from "@/api/payments";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";

export default function PaymentSetupScreen() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"customer" | "provider">("customer");
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: account, isLoading } = useQuery({
    queryKey: ["payment-account"],
    queryFn: getMyPaymentAccount,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => setupPaymentAccount({ email, name: name || undefined, account_type: accountType }),
    onSuccess: (data) => {
      if (data.onboarding_url) {
        setOnboardingUrl(data.onboarding_url);
      } else {
        Alert.alert("Success", "Payment account set up successfully");
      }
    },
    onError: () => Alert.alert("Error", "Failed to set up payment account"),
  });

  if (isLoading) return <LoadingScreen />;

  const handleWebViewNavigation = useCallback(
    (navState: WebViewNavigation) => {
      const { url } = navState;
      if (url.includes("return") || url.includes("refresh")) {
        setOnboardingUrl(null);
        queryClient.invalidateQueries({ queryKey: ["payment-account"] });
      }
    },
    [queryClient],
  );

  // Show Stripe onboarding WebView
  if (onboardingUrl) {
    return (
      <View className="flex-1">
        <Stack.Screen options={{ title: "Stripe Setup" }} />
        <Pressable
          onPress={() => {
            setOnboardingUrl(null);
            queryClient.invalidateQueries({ queryKey: ["payment-account"] });
          }}
          className="flex-row items-center bg-white px-4 py-3"
        >
          <Ionicons name="close" size={24} color={COLORS.gray[700]} />
          <Text className="ml-2 text-base font-medium text-dark-700">Close</Text>
        </Pressable>
        <WebView
          source={{ uri: onboardingUrl }}
          className="flex-1"
          onNavigationStateChange={handleWebViewNavigation}
        />
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
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending || !email}
          className={`items-center rounded-xl py-4 ${
            mutation.isPending || !email ? "bg-primary-300" : "bg-primary-900"
          }`}
        >
          <Text className="text-base font-bold text-white">
            {mutation.isPending ? "Setting up..." : "Set Up Account"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
