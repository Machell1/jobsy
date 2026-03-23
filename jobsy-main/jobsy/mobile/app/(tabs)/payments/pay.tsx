import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";

import { initiatePayment } from "@/api/payments";
import { api } from "@/api/client";

type PaymentMethod = "stripe" | "paypal";

export default function PayScreen() {
  const { payeeId, listingId, matchId } = useLocalSearchParams<{
    payeeId: string;
    listingId?: string;
    matchId?: string;
  }>();
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");

  // Stripe payment
  const stripeMutation = useMutation({
    mutationFn: () =>
      initiatePayment({
        payee_id: payeeId!,
        listing_id: listingId,
        match_id: matchId,
        amount: parseFloat(amount),
        currency: "JMD",
        description: description || undefined,
      }),
    onSuccess: (data) => {
      if (data.client_secret) {
        Alert.alert(
          "Payment Initiated",
          `Transaction ${data.transaction_id} created. Amount: J$${data.amount}`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert("Success", "Payment recorded", [{ text: "OK", onPress: () => router.back() }]);
      }
    },
    onError: () => Alert.alert("Error", "Payment failed. Please try again."),
  });

  // PayPal payment
  const paypalMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/api/paypal/create", {
        payee_id: payeeId!,
        listing_id: listingId,
        match_id: matchId,
        amount: parseFloat(amount),
        currency: "JMD",
        description: description || undefined,
      });
      return data;
    },
    onSuccess: async (data) => {
      if (data.approval_url) {
        const result = await WebBrowser.openBrowserAsync(data.approval_url);
        if (result.type === "cancel") {
          Alert.alert("Cancelled", "PayPal payment was cancelled.");
          return;
        }
        // Execute the payment after approval
        try {
          await api.post("/api/paypal/execute", {
            payment_id: data.payment_id,
            payer_id: data.payer_id,
          });
          Alert.alert("Success", "PayPal payment completed.", [
            { text: "OK", onPress: () => router.back() },
          ]);
        } catch {
          Alert.alert("Error", "Failed to complete PayPal payment.");
        }
      } else {
        Alert.alert("Success", "Payment recorded", [{ text: "OK", onPress: () => router.back() }]);
      }
    },
    onError: () => Alert.alert("Error", "Failed to initiate PayPal payment."),
  });

  const isPending = stripeMutation.isPending || paypalMutation.isPending;

  const handlePay = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return Alert.alert("Invalid", "Enter a valid amount");
    }
    if (paymentMethod === "paypal") {
      paypalMutation.mutate();
    } else {
      stripeMutation.mutate();
    }
  };

  return (
    <ScrollView className="flex-1 bg-dark-50" keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Make Payment" }} />

      <View className="p-4">
        <View className="items-center rounded-2xl bg-white p-6">
          <Text className="text-sm text-dark-500">You are paying</Text>
          <Text className="mt-1 text-sm text-dark-400">User: {payeeId?.slice(0, 12)}...</Text>
        </View>

        <Text className="mb-1.5 mt-6 text-sm font-semibold text-dark-700">Amount (JMD)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="numeric"
          className="rounded-xl border border-dark-200 bg-white px-4 py-4 text-center text-3xl font-bold"
        />

        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What is this payment for?"
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
        />

        {/* Payment Method Selection */}
        <Text className="mb-2 mt-6 text-sm font-semibold text-dark-700">Payment Method</Text>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => setPaymentMethod("stripe")}
            className={`flex-1 flex-row items-center justify-center rounded-xl border-2 py-3.5 ${
              paymentMethod === "stripe" ? "border-primary-900 bg-primary-50" : "border-dark-200 bg-white"
            }`}
          >
            <Ionicons
              name="card"
              size={20}
              color={paymentMethod === "stripe" ? "#1B5E20" : "#9E9E9E"}
            />
            <Text
              className={`ml-2 text-sm font-semibold ${
                paymentMethod === "stripe" ? "text-primary-900" : "text-dark-500"
              }`}
            >
              Card (Stripe)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPaymentMethod("paypal")}
            className={`flex-1 flex-row items-center justify-center rounded-xl border-2 py-3.5 ${
              paymentMethod === "paypal" ? "border-blue-600 bg-blue-50" : "border-dark-200 bg-white"
            }`}
          >
            <Ionicons
              name="logo-paypal"
              size={20}
              color={paymentMethod === "paypal" ? "#003087" : "#9E9E9E"}
            />
            <Text
              className={`ml-2 text-sm font-semibold ${
                paymentMethod === "paypal" ? "text-blue-700" : "text-dark-500"
              }`}
            >
              PayPal
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handlePay}
          disabled={isPending}
          className={`mt-6 flex-row items-center justify-center rounded-xl py-4 ${
            isPending ? "bg-primary-300" : paymentMethod === "paypal" ? "bg-blue-600" : "bg-primary-900"
          }`}
        >
          <Ionicons
            name={paymentMethod === "paypal" ? "logo-paypal" : "card"}
            size={20}
            color="white"
          />
          <Text className="ml-2 text-base font-bold text-white">
            {isPending
              ? "Processing..."
              : paymentMethod === "paypal"
                ? "Pay with PayPal"
                : "Pay Now"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
