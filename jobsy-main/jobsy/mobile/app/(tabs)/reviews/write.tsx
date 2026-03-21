import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createReview } from "@/api/reviews";
import { ReviewStars } from "@/components/ReviewStars";

export default function WriteReviewScreen() {
  const { revieweeId, listingId, transactionId } = useLocalSearchParams<{
    revieweeId: string;
    listingId?: string;
    transactionId?: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [qualityRating, setQualityRating] = useState(0);
  const [punctualityRating, setPunctualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);

  const mutation = useMutation({
    mutationFn: () =>
      createReview({
        reviewee_id: revieweeId!,
        listing_id: listingId,
        transaction_id: transactionId,
        rating,
        title: title || undefined,
        body: body || undefined,
        quality_rating: qualityRating || undefined,
        punctuality_rating: punctualityRating || undefined,
        communication_rating: communicationRating || undefined,
        value_rating: valueRating || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", revieweeId] });
      router.back();
    },
    onError: () => Alert.alert("Error", "Failed to submit review"),
  });

  const handleSubmit = () => {
    if (rating === 0) return Alert.alert("Required", "Please select an overall rating");
    mutation.mutate();
  };

  return (
    <ScrollView className="flex-1 bg-dark-50" keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Write Review" }} />

      <View className="p-4">
        {/* Overall rating */}
        <View className="items-center rounded-2xl bg-white p-6">
          <Text className="text-lg font-bold text-dark-800">Overall Rating</Text>
          <View className="mt-3">
            <ReviewStars rating={rating} size={36} editable onChange={setRating} />
          </View>
        </View>

        {/* Detailed ratings */}
        <View className="mt-4 rounded-2xl bg-white p-4">
          <Text className="mb-3 text-sm font-semibold text-dark-700">Detailed Ratings</Text>
          <RatingRow label="Quality" value={qualityRating} onChange={setQualityRating} />
          <RatingRow label="Punctuality" value={punctualityRating} onChange={setPunctualityRating} />
          <RatingRow label="Communication" value={communicationRating} onChange={setCommunicationRating} />
          <RatingRow label="Value" value={valueRating} onChange={setValueRating} />
        </View>

        {/* Title */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Title (optional)</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Summarize your experience"
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
          maxLength={200}
        />

        {/* Body */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Review</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Share your experience..."
          multiline
          numberOfLines={5}
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
          style={{ textAlignVertical: "top", minHeight: 120 }}
        />

        <Pressable
          onPress={handleSubmit}
          disabled={mutation.isPending}
          className={`mt-6 items-center rounded-xl py-4 ${
            mutation.isPending ? "bg-primary-300" : "bg-primary-900"
          }`}
        >
          <Text className="text-base font-bold text-white">
            {mutation.isPending ? "Submitting..." : "Submit Review"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-sm text-dark-600">{label}</Text>
      <ReviewStars rating={value} size={20} editable onChange={onChange} />
    </View>
  );
}
