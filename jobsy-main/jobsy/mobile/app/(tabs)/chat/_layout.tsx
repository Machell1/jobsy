import { Stack } from "expo-router";
import { OverlayProvider, Chat } from "stream-chat-expo";
import type { DeepPartial, Theme } from "stream-chat-expo";

import { LoadingScreen } from "@/components/LoadingScreen";
import { EmptyState } from "@/components/EmptyState";
import { useChatStore } from "@/stores/chat";

const STREAM_THEME: DeepPartial<Theme> = {
  colors: {
    accent_blue: "#0D9488",
    accent_green: "#0D9488",
  },
};

export default function ChatLayout() {
  const { client, isReady, error } = useChatStore();

  if (!isReady || !client) {
    if (error) {
      return (
        <EmptyState
          icon="chatbubbles-outline"
          title="Chat unavailable"
          subtitle={error}
        />
      );
    }
    return <LoadingScreen />;
  }

  return (
    <OverlayProvider style={STREAM_THEME}>
      {/* @ts-expect-error stream-chat dual-package generics mismatch */}
      <Chat client={client}>
        <Stack screenOptions={{ headerShown: true }} />
      </Chat>
    </OverlayProvider>
  );
}
