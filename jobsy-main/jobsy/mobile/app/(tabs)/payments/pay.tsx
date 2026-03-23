import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import { initiatePayment } from "@/api/payments";

export default function PayScreen() {
  const { payeeId, listingId, matchId } = useLocalSearchParams<{
    payeeId: string;
    listingId?: string;
    matchId?: string;
  }>();
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
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
        // In production, use Stripe's confirmPayment with client_secret
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

  const handlePay = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return Alert.alert("Invalid", "Enter a valid amount");
    }
    mutation.mutate();
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

        <Pressable
          onPress={handlePay}
          disabled={mutation.isPending}
          className={`mt-6 items-center rounded-xl py-4 ${
            mutation.isPending ? "bg-primary-300" : "bg-primary-900"
          }`}
        >
          <Text className="text-base font-bold text-white">
            {mutation.isPending ? "Processing..." : "Pay Now"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
