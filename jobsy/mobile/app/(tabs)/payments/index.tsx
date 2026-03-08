import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { getTransactions, Transaction } from "@/api/payments";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { formatCurrency, formatDate } from "@/utils/format";

export default function PaymentsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions({ limit: 50 }),
  });

  if (isLoading) return <LoadingScreen />;

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <View className="flex-1 bg-dark-50">
      <Stack.Screen
        options={{
          title: "Payments",
          headerRight: () => (
            <Pressable onPress={() => router.push("/(tabs)/payments/setup")}>
              <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Transaction }) => {
          const isPayer = item.payer_id === userId;
          return (
            <View className="mx-4 mb-3 rounded-2xl bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="font-semibold text-dark-800">
                    {isPayer ? "Payment sent" : "Payment received"}
                  </Text>
                  {item.description && (
                    <Text className="mt-0.5 text-sm text-dark-500">{item.description}</Text>
                  )}
                </View>
                <Text className={`text-lg font-bold ${isPayer ? "text-red-600" : "text-green-600"}`}>
                  {isPayer ? "-" : "+"}{formatCurrency(item.amount, item.currency)}
                </Text>
              </View>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs text-dark-400">{formatDate(item.created_at)}</Text>
                <View className={`rounded-full px-2 py-0.5 ${statusColors[item.status] || ""}`}>
                  <Text className="text-xs font-medium capitalize">{item.status}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="card-outline"
            title="No transactions yet"
            subtitle="Your payment history will appear here"
          />
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, flexGrow: 1 }}
      />
    </View>
  );
}
