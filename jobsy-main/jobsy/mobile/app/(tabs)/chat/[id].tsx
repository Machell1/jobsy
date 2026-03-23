import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View, Text, Pressable } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Channel, MessageList, MessageInput } from "stream-chat-expo";
import type { Channel as ChannelType } from "stream-chat";

import { LoadingScreen } from "@/components/LoadingScreen";
import { useChatStore } from "@/stores/chat";

export default function ChatThreadScreen() {
  const { id: channelId } = useLocalSearchParams<{ id: string }>();
  const { client, isReady } = useChatStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [channel, setChannel] = useState<ChannelType<any> | null>(null);
  const [chatError, setChatError] = useState(false);

  useEffect(() => {
    if (!client || !channelId) return;

    const ch = client.channel("messaging", channelId);
    ch.watch()
      .then(() => setChannel(ch))
      .catch((err) => {
        console.error(err);
        setChatError(true);
        Alert.alert("Error", "Could not load chat");
      });
  }, [client, channelId]);

  if (chatError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" }}>
        <Text style={{ color: "#6B7280", fontSize: 16 }}>Failed to load chat</Text>
      </View>
    );
  }

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
      {/* @ts-expect-error stream-chat dual-package generics mismatch */}
      <Channel channel={channel}>
        <View style={{ flex: 1 }}>
          <MessageList />
          <MessageInput />
        </View>
      </Channel>
    </KeyboardAvoidingView>
  );
}
