import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { getProfile } from "@/api/profiles";
import { getUserRatingSummary } from "@/api/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ReviewStars } from "@/components/ReviewStars";
import { COLORS } from "@/constants/theme";
import { formatCurrency } from "@/utils/format";

export default function ViewProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: () => getProfile(id!),
    enabled: !!id,
  });

  const { data: ratingSummary } = useQuery({
    queryKey: ["rating-summary", id],
    queryFn: () => getUserRatingSummary(id!),
    enabled: !!id,
  });

  if (isLoading || !profile) return <LoadingScreen />;

  return (
    <ScrollView className="flex-1 bg-dark-50">
      <Stack.Screen options={{ title: profile.display_name }} />

      {/* Header */}
      <View className="items-center bg-white px-6 pb-6 pt-8">
        <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary-100">
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} className="h-full w-full" />
          ) : (
            <Ionicons name="person" size={48} color={COLORS.primaryLight} />
          )}
        </View>
        <Text className="mt-3 text-2xl font-bold text-dark-800">{profile.display_name}</Text>
        {profile.service_category && (
          <Text className="mt-1 text-base text-primary-700">{profile.service_category}</Text>
        )}
        <View className="mt-2 flex-row items-center gap-2">
          <ReviewStars rating={Number(profile.rating_avg)} />
          <Text className="text-sm text-dark-500">
            {Number(profile.rating_avg).toFixed(1)} ({profile.rating_count} reviews)
          </Text>
        </View>
        {profile.hourly_rate && (
          <Text className="mt-2 text-2xl font-bold text-primary-900">
            {formatCurrency(Number(profile.hourly_rate))}/hr
          </Text>
        )}
        {profile.parish && (
          <View className="mt-2 flex-row items-center">
            <Ionicons name="location-outline" size={16} color={COLORS.gray[500]} />
            <Text className="ml-1 text-sm text-dark-500">{profile.parish}</Text>
          </View>
        )}
      </View>

      {/* Bio */}
      {profile.bio && (
        <View className="mx-4 mt-4 rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-dark-700">About</Text>
          <Text className="mt-2 leading-5 text-dark-500">{profile.bio}</Text>
        </View>
      )}

      {/* Skills */}
      {profile.skills.length > 0 && (
        <View className="mx-4 mt-3 rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-dark-700">Skills</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <View key={skill} className="rounded-lg bg-primary-50 px-3 py-1.5">
                <Text className="text-sm text-primary-900">{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Rating breakdown */}
      {ratingSummary?.breakdown && (
        <View className="mx-4 mt-3 rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-dark-700">Rating Breakdown</Text>
          {Object.entries(ratingSummary.breakdown).map(([key, value]) =>
            value != null ? (
              <View key={key} className="mt-2 flex-row items-center justify-between">
                <Text className="text-sm capitalize text-dark-500">{key}</Text>
                <View className="flex-row items-center gap-2">
                  <ReviewStars rating={value} size={14} />
                  <Text className="text-sm text-dark-600">{value.toFixed(1)}</Text>
                </View>
              </View>
            ) : null
          )}
        </View>
      )}

      {/* Action buttons */}
      <View className="mx-4 mt-4 mb-10 gap-3">
        <Pressable
          onPress={() => router.push(`/(tabs)/reviews/${id}`)}
          className="items-center rounded-xl border-2 border-primary-900 py-3"
        >
          <Text className="font-bold text-primary-900">View Reviews</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
