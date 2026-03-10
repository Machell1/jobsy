import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { getUserReviews, getUserRatingSummary, Review } from "@/api/reviews";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ReviewStars } from "@/components/ReviewStars";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { formatDate } from "@/utils/format";

export default function ReviewsScreen() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const isOwnProfile = userId === user?.id;

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
      <Stack.Screen options={{ title: isOwnProfile ? "My Reviews" : "Reviews" }} />
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        ListHeaderComponent={
          summary ? (
            <View className="mx-4 mt-4 mb-2 items-center rounded-2xl bg-white p-5">
              <Text className="text-4xl font-bold text-dark-800">
                {Number(summary.average_rating).toFixed(1)}
              </Text>
              <ReviewStars rating={Number(summary.average_rating)} size={24} />
              <Text className="mt-1 text-sm text-dark-400">
                {summary.total_reviews} review{summary.total_reviews !== 1 ? "s" : ""}
              </Text>
              {summary.breakdown && (
                <View className="mt-3 w-full">
                  {Object.entries(summary.breakdown).map(
                    ([key, value]) =>
                      value != null && (
                        <View
                          key={key}
                          className="mt-1 flex-row items-center justify-between"
                        >
                          <Text className="text-sm capitalize text-dark-500">{key}</Text>
                          <View className="flex-row items-center gap-1">
                            <ReviewStars rating={value} size={12} />
                            <Text className="text-xs text-dark-500">
                              {value.toFixed(1)}
                            </Text>
                          </View>
                        </View>
                      )
                  )}
                </View>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }: { item: Review }) => (
          <View className="mx-4 mt-3 rounded-2xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <ReviewStars rating={item.rating} size={16} />
              <Text className="text-xs text-dark-400">{formatDate(item.created_at)}</Text>
            </View>
            {item.title && (
              <Text className="mt-2 font-semibold text-dark-800">{item.title}</Text>
            )}
            {item.body && (
              <Text className="mt-1 leading-5 text-dark-600">{item.body}</Text>
            )}
            {item.is_verified && (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primaryLight} />
                <Text className="ml-1 text-xs text-primary-700">Verified Purchase</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="star-outline"
            title="No reviews yet"
            subtitle={isOwnProfile ? "Reviews will appear here when clients rate your work" : "This user has no reviews yet"}
          />
        }
      />
      {!isOwnProfile && (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(tabs)/reviews/write",
              params: { revieweeId: userId },
            })
          }
          className="mx-4 mb-6 items-center rounded-xl bg-primary-900 py-4"
        >
          <Text className="text-base font-bold text-white">Write a Review</Text>
        </Pressable>
      )}
    </View>
  );
}
