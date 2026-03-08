import { Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { getListing } from "@/api/listings";
import { getProfile } from "@/api/profiles";
import { recordSwipe } from "@/api/swipes";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";
import { formatCurrency, formatDate } from "@/utils/format";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListing(id!),
    enabled: !!id,
  });

  const { data: poster } = useQuery({
    queryKey: ["profile", listing?.poster_id],
    queryFn: () => getProfile(listing!.poster_id),
    enabled: !!listing?.poster_id,
  });

  if (isLoading || !listing) return <LoadingScreen />;

  const budgetText =
    listing.budget_min && listing.budget_max
      ? `${formatCurrency(Number(listing.budget_min))} - ${formatCurrency(Number(listing.budget_max))}`
      : listing.budget_min
        ? `From ${formatCurrency(Number(listing.budget_min))}`
        : listing.budget_max
          ? `Up to ${formatCurrency(Number(listing.budget_max))}`
          : "Budget flexible";

  const handleInterested = async () => {
    try {
      await recordSwipe({
        target_id: listing.id,
        target_type: "listing",
        direction: "right",
      });
    } catch {
      // Already swiped
    }
    router.back();
  };

  return (
    <ScrollView className="flex-1 bg-dark-50">
      <Stack.Screen options={{ title: "Listing Details" }} />

      {/* Header image placeholder */}
      <View className="h-48 items-center justify-center bg-primary-100">
        <Ionicons name="briefcase-outline" size={60} color={COLORS.primaryLight} />
      </View>

      <View className="p-4">
        {/* Title + category */}
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 text-2xl font-bold text-dark-800">{listing.title}</Text>
          <View className="ml-3 rounded-full bg-primary-50 px-3 py-1">
            <Text className="text-sm font-medium text-primary-800">{listing.category}</Text>
          </View>
        </View>

        {/* Budget */}
        <Text className="mt-2 text-xl font-bold text-primary-900">{budgetText}</Text>
        <Text className="text-xs text-dark-400">{listing.currency}</Text>

        {/* Location + date */}
        <View className="mt-3 flex-row items-center gap-4">
          {listing.parish && (
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={16} color={COLORS.gray[500]} />
              <Text className="ml-1 text-sm text-dark-500">{listing.parish}</Text>
            </View>
          )}
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color={COLORS.gray[500]} />
            <Text className="ml-1 text-sm text-dark-500">{formatDate(listing.created_at)}</Text>
          </View>
        </View>

        {/* Description */}
        <View className="mt-4 rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-dark-700">Description</Text>
          <Text className="mt-2 leading-6 text-dark-600">{listing.description}</Text>
        </View>

        {/* Poster info */}
        {poster && (
          <Pressable
            onPress={() => router.push(`/(tabs)/profile/${poster.user_id}`)}
            className="mt-3 flex-row items-center rounded-2xl bg-white p-4"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <Ionicons name="person" size={20} color={COLORS.primaryLight} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-dark-800">{poster.display_name}</Text>
              {poster.parish && (
                <Text className="text-sm text-dark-400">{poster.parish}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
          </Pressable>
        )}

        {/* Action buttons */}
        <Pressable
          onPress={handleInterested}
          className="mt-6 items-center rounded-xl bg-primary-900 py-4"
        >
          <Text className="text-base font-bold text-white">I&apos;m Interested</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
