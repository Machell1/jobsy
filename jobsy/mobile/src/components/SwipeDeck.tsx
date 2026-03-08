import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Listing } from "@/api/listings";
import { COLORS } from "@/constants/theme";

import { EmptyState } from "./EmptyState";
import { SwipeCard } from "./SwipeCard";

interface SwipeDeckProps {
  listings: Listing[];
  onSwipe: (listing: Listing, direction: "left" | "right") => void;
  onTap?: (listing: Listing) => void;
}

export function SwipeDeck({ listings, onSwipe, onTap }: SwipeDeckProps) {
  if (listings.length === 0) {
    return (
      <EmptyState
        icon="albums-outline"
        title="No more listings"
        subtitle="Check back later for new service listings in your area"
      />
    );
  }

  // Show top 3 cards stacked
  const visibleCards = listings.slice(0, 3).reverse();

  return (
    <View className="flex-1">
      {/* Card stack */}
      <View className="flex-1 items-center justify-center">
        {visibleCards.map((listing, reverseIndex) => {
          const index = visibleCards.length - 1 - reverseIndex;
          return (
            <SwipeCard
              key={listing.id}
              listing={listing}
              isFirst={index === 0}
              index={index}
              onSwipe={(direction) => onSwipe(listing, direction)}
            />
          );
        })}
      </View>

      {/* Action buttons */}
      <View className="flex-row items-center justify-center gap-6 pb-6 pt-2">
        <Pressable
          onPress={() => listings[0] && onSwipe(listings[0], "left")}
          className="h-16 w-16 items-center justify-center rounded-full bg-red-50 shadow-sm"
        >
          <Ionicons name="close" size={32} color={COLORS.error} />
        </Pressable>

        <Pressable
          onPress={() => listings[0] && onTap?.(listings[0])}
          className="h-12 w-12 items-center justify-center rounded-full bg-blue-50 shadow-sm"
        >
          <Ionicons name="information" size={24} color={COLORS.info} />
        </Pressable>

        <Pressable
          onPress={() => listings[0] && onSwipe(listings[0], "right")}
          className="h-16 w-16 items-center justify-center rounded-full bg-green-50 shadow-sm"
        >
          <Ionicons name="heart" size={32} color={COLORS.success} />
        </Pressable>
      </View>
    </View>
  );
}
