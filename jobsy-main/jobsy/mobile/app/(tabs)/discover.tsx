import { View } from "react-native";
import { useRouter } from "expo-router";

import { LoadingScreen } from "@/components/LoadingScreen";
import { SwipeDeck } from "@/components/SwipeDeck";
import { useSwipeDeck } from "@/hooks/useSwipeDeck";
import { useLocationStore } from "@/stores/location";
import { useEffect } from "react";

export default function DiscoverScreen() {
  const router = useRouter();
  const { listings, isLoading, handleSwipe } = useSwipeDeck();
  const requestLocation = useLocationStore((s) => s.requestLocation);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  if (isLoading) return <LoadingScreen />;

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
