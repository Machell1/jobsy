import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { LoadingScreen } from "@/components/LoadingScreen";
import { SwipeDeck } from "@/components/SwipeDeck";
import { useSwipeDeck } from "@/hooks/useSwipeDeck";
import { useLocationStore } from "@/stores/location";
import { useEffect } from "react";

export default function DiscoverScreen() {
  const router = useRouter();
  const { listings, isLoading, error, handleSwipe, refetch } = useSwipeDeck();
  const requestLocation = useLocationStore((s) => s.requestLocation);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  if (isLoading) return <LoadingScreen />;

  if (error) {
    return (
      <View className="flex-1 bg-dark-50 items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text className="text-base text-gray-500 mt-3 text-center">
          Could not load listings. Please try again.
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="mt-4 bg-green-700 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (listings.length === 0) {
    return (
      <View className="flex-1 bg-dark-50 items-center justify-center px-8">
        <Ionicons name="search-outline" size={48} color="#9CA3AF" />
        <Text className="text-lg font-semibold text-gray-700 mt-3">
          No Listings Found
        </Text>
        <Text className="text-sm text-gray-500 mt-1 text-center">
          There are no listings to show right now. Check back later!
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="mt-4 bg-green-700 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Refresh</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-dark-50">
      <SwipeDeck
        listings={listings}
        onSwipe={handleSwipe}
        onTap={(listing) => router.push(`/(tabs)/listing/${listing.id}`)}
      />
    </View>
  );
}
