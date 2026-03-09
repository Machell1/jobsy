import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { getMessages, markConversationRead, Message } from "@/api/chat";
import { ChatBubble } from "@/components/ChatBubble";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuthStore } from "@/stores/auth";

export default function ChatThreadScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id) || "";
  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(conversationId!, { limit: 50 }),
    enabled: !!conversationId,
  });

  const { messages: wsMessages, sendMessage, isConnected } = useWebSocket(conversationId || null);

  // Combine initial messages with WebSocket messages
  const allMessages = [
    ...(initialMessages || []),
    ...wsMessages.filter((m) => !initialMessages?.some((im) => im.id === m.id)),
  ];

  useEffect(() => {
    if (conversationId) {
      markConversationRead(conversationId).catch(() => {});
    }
  }, [conversationId]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (allMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [allMessages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput("");
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-dark-50"
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: `Chat #${conversationId?.slice(0, 8) || ""}`,
          headerRight: () => (
            <View className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          ),
        }}
      />

      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item: Message) => item.id}
        renderItem={({ item }) => (
          <ChatBubble
            content={item.content}
            isMine={item.sender_id === userId}
            timestamp={item.created_at}
            messageType={item.message_type}
          />
        )}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Message input */}
      <View className="flex-row items-end border-t border-dark-200 bg-white px-4 py-3">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          multiline
          className="max-h-24 flex-1 rounded-2xl bg-dark-50 px-4 py-2.5 text-base text-dark-800"
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim()}
          className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-primary-900"
        >
          <Ionicons name="send" size={18} color="white" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
