import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Channel, MessageList, MessageInput } from "stream-chat-expo";
import type { Channel as ChannelType } from "stream-chat";

import { LoadingScreen } from "@/components/LoadingScreen";
import { useChatStore } from "@/stores/chat";

export default function ChatThreadScreen() {
  const { id: channelId } = useLocalSearchParams<{ id: string }>();
  const { client, isReady } = useChatStore();
  const [channel, setChannel] = useState<ChannelType | null>(null);

  useEffect(() => {
    if (!client || !channelId) return;

    const ch = client.channel("messaging", channelId);
    ch.watch().then(() => setChannel(ch));
  }, [client, channelId]);

  if (!isReady || !channel) return <LoadingScreen />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{ title: `Chat #${channelId?.slice(0, 8) || ""}` }}
      />
      <Channel channel={channel}>
        <View style={{ flex: 1 }}>
          <MessageList />
          <MessageInput />
        </View>
      </Channel>
    </KeyboardAvoidingView>
  );
}
