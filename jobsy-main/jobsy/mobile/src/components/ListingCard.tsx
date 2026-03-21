import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Listing } from "@/api/listings";
import { COLORS } from "@/constants/theme";
import { formatCurrency, formatRelativeTime } from "@/utils/format";

interface ListingCardProps {
  listing: Listing;
  onPress: () => void;
}

export function ListingCard({ listing, onPress }: ListingCardProps) {
  const budgetText =
    listing.budget_min && listing.budget_max
      ? `${formatCurrency(Number(listing.budget_min))} - ${formatCurrency(Number(listing.budget_max))}`
      : listing.budget_min
        ? `From ${formatCurrency(Number(listing.budget_min))}`
        : listing.budget_max
          ? `Up to ${formatCurrency(Number(listing.budget_max))}`
          : "Budget flexible";

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-bold text-dark-800" numberOfLines={1}>
            {listing.title}
          </Text>
          <Text className="mt-1 text-sm text-dark-500" numberOfLines={2}>
            {listing.description}
          </Text>
        </View>
        <View className="ml-3 rounded-full bg-primary-50 px-2.5 py-1">
          <Text className="text-xs font-medium text-primary-800">{listing.category}</Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-primary-900">{budgetText}</Text>
        <Text className="text-xs text-dark-400">{formatRelativeTime(listing.created_at)}</Text>
      </View>

      {listing.parish && (
        <View className="mt-2 flex-row items-center">
          <Ionicons name="location-outline" size={14} color={COLORS.gray[500]} />
          <Text className="ml-1 text-xs text-dark-500">{listing.parish}</Text>
        </View>
      )}
    </Pressable>
  );
}
