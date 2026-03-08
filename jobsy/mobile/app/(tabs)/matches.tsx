import { FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { getMatches } from "@/api/matches";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MatchCard } from "@/components/MatchCard";
import { useAuthStore } from "@/stores/auth";

export default function MatchesScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id) || "";

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => getMatches({ limit: 50 }),
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-dark-50">
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            currentUserId={userId}
            onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="No matches yet"
            subtitle="Swipe right on listings you're interested in to find matches"
          />
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, flexGrow: 1 }}
      />
    </View>
  );
}
