import { Text, View } from "react-native";

import { formatTime } from "@/utils/format";

interface ChatBubbleProps {
  content: string;
  isMine: boolean;
  timestamp: string;
  messageType?: string;
}

export function ChatBubble({ content, isMine, timestamp, messageType = "text" }: ChatBubbleProps) {
  return (
    <View className={`mb-2 max-w-[80%] ${isMine ? "self-end" : "self-start"}`}>
      <View
        className={`rounded-2xl px-4 py-2.5 ${
          isMine ? "rounded-br-sm bg-primary-900" : "rounded-bl-sm bg-dark-100"
        }`}
      >
        <Text className={isMine ? "text-white" : "text-dark-800"}>{content}</Text>
      </View>
      <Text
        className={`mt-0.5 text-xs text-dark-400 ${isMine ? "text-right" : "text-left"}`}
      >
        {formatTime(timestamp)}
      </Text>
    </View>
  );
}
