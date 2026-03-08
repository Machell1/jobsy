import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { getConversations } from "@/api/chat";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";
import { formatRelativeTime } from "@/utils/format";

export default function ChatListScreen() {
  const router = useRouter();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations({ limit: 50 }),
    refetchInterval: 10000, // Poll every 10s for new conversations
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-dark-50">
      <Stack.Screen options={{ title: "Messages" }} />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
            className="mx-4 mb-2 flex-row items-center rounded-2xl bg-white p-4 shadow-sm"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <Ionicons name="chatbubble-ellipses" size={22} color={COLORS.primaryLight} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-dark-800">
                Chat #{item.id.slice(0, 8)}
              </Text>
              <Text className="text-sm text-dark-400">
                With user: {item.other_user_id.slice(0, 8)}...
              </Text>
            </View>
            <Text className="text-xs text-dark-400">
              {formatRelativeTime(item.created_at)}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations yet"
            subtitle="Match with someone to start chatting"
          />
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, flexGrow: 1 }}
      />
    </View>
  );
}
