import { useCallback } from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ChannelList } from "stream-chat-expo";

import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useChatStore } from "@/stores/chat";

export default function ChatListScreen() {
  const router = useRouter();
  const { client, isReady } = useChatStore();

  const filters = client?.user?.id
    ? { type: "messaging", members: { $in: [client.user.id] } }
    : {};

  const sort = [{ last_message_at: -1 as const }];

  const onSelect = useCallback(
    (channel: { cid: string; id?: string }) => {
      router.push(`/(tabs)/chat/${channel.id ?? channel.cid}`);
    },
    [router],
  );

  if (!isReady || !client) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <Stack.Screen options={{ title: "Messages" }} />
      <ChannelList
        filters={filters}
        sort={sort}
        onSelect={onSelect}
        EmptyStateIndicator={() => (
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations yet"
            subtitle="Match with someone to start chatting"
          />
        )}
      />
    </View>
  );
}
