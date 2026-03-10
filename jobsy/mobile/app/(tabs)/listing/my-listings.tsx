import { FlatList, Pressable, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { getMyListings } from "@/api/listings";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard } from "@/components/ListingCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";

export default function MyListingsScreen() {
  const router = useRouter();

  // Fetch all statuses for user's own listings
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["my-listings"],
    queryFn: () => getMyListings({ limit: 50 }),
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-dark-50">
      <Stack.Screen
        options={{
          title: "My Listings",
          headerRight: () => (
            <Pressable onPress={() => router.push("/(tabs)/listing/create")}>
              <Ionicons name="add-circle" size={28} color={COLORS.primary} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onPress={() => router.push(`/(tabs)/listing/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="document-outline"
            title="No listings yet"
            subtitle="Post your first job listing to get started"
          />
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, flexGrow: 1 }}
      />
    </View>
  );
}
