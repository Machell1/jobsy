import { FlatList, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { getUserRatingSummary, getUserReviews } from "@/api/reviews";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ReviewStars } from "@/components/ReviewStars";
import { formatDate } from "@/utils/format";

export default function UserReviewsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", userId],
    queryFn: () => getUserReviews(userId!, { limit: 50 }),
    enabled: !!userId,
  });

  const { data: summary } = useQuery({
    queryKey: ["rating-summary", userId],
    queryFn: () => getUserRatingSummary(userId!),
    enabled: !!userId,
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-dark-50">
      <Stack.Screen options={{ title: "Reviews" }} />

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          summary ? (
            <View className="mx-4 mb-4 items-center rounded-2xl bg-white p-6">
              <Text className="text-4xl font-bold text-dark-800">
                {summary.average_rating.toFixed(1)}
              </Text>
              <ReviewStars rating={summary.average_rating} size={24} />
              <Text className="mt-1 text-sm text-dark-400">
                {summary.total_reviews} review{summary.total_reviews !== 1 ? "s" : ""}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View className="mx-4 mb-3 rounded-2xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <ReviewStars rating={item.rating} size={16} />
              <Text className="text-xs text-dark-400">{formatDate(item.created_at)}</Text>
            </View>
            {item.title && (
              <Text className="mt-2 font-semibold text-dark-800">{item.title}</Text>
            )}
            {item.body && (
              <Text className="mt-1 text-sm text-dark-600">{item.body}</Text>
            )}
            {item.is_verified && (
              <View className="mt-2 flex-row items-center">
                <Text className="text-xs font-medium text-primary-700">Verified Purchase</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="star-outline"
            title="No reviews yet"
            subtitle="Reviews will appear here after completed services"
          />
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, flexGrow: 1 }}
      />
    </View>
  );
}
