import { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getUserReviews, getUserRatingSummary, respondToReview, flagReview, Review } from "@/api/reviews";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ReviewStars } from "@/components/ReviewStars";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { formatDate } from "@/utils/format";

export default function ReviewsScreen() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isOwnProfile = userId === user?.id;

  const [respondingToReview, setRespondingToReview] = useState<Review | null>(null);
  const [responseBody, setResponseBody] = useState('');

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

  const respondMutation = useMutation({
    mutationFn: ({ reviewId, body }: { reviewId: string; body: string }) =>
      respondToReview(reviewId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', userId] });
      setRespondingToReview(null);
      setResponseBody('');
      Alert.alert('Response posted', 'Your response has been added to the review.');
    },
    onError: () => Alert.alert('Error', 'Failed to post response. Please try again.'),
  });

  const flagMutation = useMutation({
    mutationFn: (reviewId: string) => flagReview(reviewId),
    onSuccess: () => Alert.alert('Flagged', 'This review has been flagged for moderation.'),
    onError: () => Alert.alert('Error', 'Failed to flag review. Please try again.'),
  });

  function handleRespond() {
    if (!respondingToReview || !responseBody.trim()) {
      Alert.alert('Required', 'Please enter a response.');
      return;
    }
    respondMutation.mutate({ reviewId: respondingToReview.id, body: responseBody.trim() });
  }

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
            {/* Sub-ratings breakdown */}
            {(item.quality_rating || item.punctuality_rating || item.communication_rating || item.value_rating) && (
              <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                {item.quality_rating != null && (
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs text-dark-500">Quality</Text>
                    <ReviewStars rating={item.quality_rating} size={11} />
                  </View>
                )}
                {item.punctuality_rating != null && (
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs text-dark-500">Punctuality</Text>
                    <ReviewStars rating={item.punctuality_rating} size={11} />
                  </View>
                )}
                {item.communication_rating != null && (
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs text-dark-500">Communication</Text>
                    <ReviewStars rating={item.communication_rating} size={11} />
                  </View>
                )}
                {item.value_rating != null && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-dark-500">Value</Text>
                    <ReviewStars rating={item.value_rating} size={11} />
                  </View>
                )}
              </View>
            )}
            {item.is_verified && (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primaryLight} />
                <Text className="ml-1 text-xs text-primary-700">Verified Purchase</Text>
              </View>
            )}
            {/* Action buttons */}
            <View className="mt-3 flex-row gap-2">
              {isOwnProfile && (
                <Pressable
                  onPress={() => {
                    setRespondingToReview(item);
                    setResponseBody('');
                  }}
                  className="flex-row items-center rounded-lg px-3 py-1.5"
                  style={{ backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#4338CA' }}
                >
                  <Ionicons name="chatbubble-outline" size={13} color="#4338CA" />
                  <Text style={{ color: '#4338CA', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Respond</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() =>
                  Alert.alert('Flag Review', 'Flag this review for moderation?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Flag',
                      style: 'destructive',
                      onPress: () => flagMutation.mutate(item.id),
                    },
                  ])
                }
                className="flex-row items-center rounded-lg px-3 py-1.5"
                style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#92400E' }}
                disabled={flagMutation.isPending}
              >
                <Ionicons name="flag-outline" size={13} color="#92400E" />
                <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Flag</Text>
              </Pressable>
            </View>
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

      {/* Respond to Review Modal */}
      <Modal
        visible={!!respondingToReview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRespondingToReview(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900">Respond to Review</Text>
              <Pressable onPress={() => setRespondingToReview(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            {respondingToReview && (
              <View className="rounded-xl bg-gray-100 p-3 mb-4">
                <ReviewStars rating={respondingToReview.rating} size={14} />
                {respondingToReview.title && (
                  <Text className="mt-1 text-sm font-semibold text-gray-800">{respondingToReview.title}</Text>
                )}
                {respondingToReview.body && (
                  <Text className="mt-1 text-sm text-gray-600" numberOfLines={3}>{respondingToReview.body}</Text>
                )}
              </View>
            )}

            <Text className="text-sm font-medium text-gray-700 mb-1">Your Response</Text>
            <TextInput
              className="bg-white rounded-lg px-3 py-2.5 mb-6 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: '#E5E7EB', minHeight: 100 }}
              placeholder="Write your response to this review..."
              value={responseBody}
              onChangeText={setResponseBody}
              multiline
              textAlignVertical="top"
            />

            <Pressable
              onPress={handleRespond}
              className="rounded-lg py-3 items-center"
              style={{ backgroundColor: '#1B5E20' }}
              disabled={respondMutation.isPending}
            >
              <Text className="text-white font-semibold text-base">
                {respondMutation.isPending ? 'Posting...' : 'Post Response'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
