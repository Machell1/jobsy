import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { followUser, getFollowers, getProfile, unfollowUser } from "@/api/profiles";
import { getUserRatingSummary } from "@/api/reviews";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ReviewStars } from "@/components/ReviewStars";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { formatCurrency } from "@/utils/format";

const SOCIAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  instagram_url: "logo-instagram",
  twitter_url: "logo-twitter",
  tiktok_url: "logo-tiktok",
  youtube_url: "logo-youtube",
  linkedin_url: "logo-linkedin",
  portfolio_url: "globe-outline",
};

export default function ViewProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

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

  const { data: followers } = useQuery({
    queryKey: ["followers", id],
    queryFn: () => getFollowers(id!),
    enabled: !!id,
  });

  const isFollowing = followers?.some((f) => f.user_id === currentUser?.id) ?? false;

  const followMutation = useMutation({
    mutationFn: () => (isFollowing ? unfollowUser(id!) : followUser(id!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followers", id] });
      queryClient.invalidateQueries({ queryKey: ["profile", id] });
    },
    onError: () => Alert.alert("Error", "Failed to update follow status"),
  });

  if (isLoading || !profile) return <LoadingScreen />;

  const socialLinks = Object.entries(SOCIAL_ICONS).filter(
    ([key]) => profile[key as keyof typeof profile],
  );

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

        {/* Follower stats */}
        <View className="mt-4 flex-row gap-8">
          <View className="items-center">
            <Text className="text-lg font-bold text-dark-800">{profile.follower_count ?? 0}</Text>
            <Text className="text-xs text-dark-400">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-dark-800">{profile.following_count ?? 0}</Text>
            <Text className="text-xs text-dark-400">Following</Text>
          </View>
        </View>

        {/* Follow button */}
        {currentUser && currentUser.id !== id && (
          <Pressable
            onPress={() => followMutation.mutate()}
            disabled={followMutation.isPending}
            className={`mt-3 rounded-xl px-8 py-2.5 ${
              isFollowing ? "border border-dark-300 bg-white" : "bg-primary-900"
            }`}
          >
            <Text className={`font-semibold ${isFollowing ? "text-dark-700" : "text-white"}`}>
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </Pressable>
        )}

        {/* Social links */}
        {socialLinks.length > 0 && (
          <View className="mt-3 flex-row gap-4">
            {socialLinks.map(([key, icon]) => (
              <Pressable
                key={key}
                onPress={() => {
                  const url = profile[key as keyof typeof profile] as string;
                  if (url) Linking.openURL(url);
                }}
              >
                <Ionicons name={icon} size={22} color={COLORS.gray[600]} />
              </Pressable>
            ))}
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
        {currentUser && currentUser.id !== id && (
          <Pressable
            onPress={() => router.push({ pathname: "/(tabs)/bookings", params: { provider_id: id } })}
            className="items-center rounded-xl bg-primary-900 py-3"
          >
            <Text className="font-bold text-white">Book Now</Text>
          </Pressable>
        )}
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
