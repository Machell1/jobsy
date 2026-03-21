import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OverlayProvider } from "stream-chat-expo";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/LoadingScreen";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuthStore } from "@/stores/auth";
import { useChatStore } from "@/stores/chat";

import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 2,
    },
  },
});

const STREAM_THEME = {
  colors: {
    accent_blue: "#1B5E20",
    accent_green: "#1B5E20",
  },
};

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const initChat = useChatStore((s) => s.initialize);
  const disconnectChat = useChatStore((s) => s.disconnect);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      initChat();
    } else {
      disconnectChat();
    }
  }, [isAuthenticated, isLoading, initChat, disconnectChat]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)/discover");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) return <LoadingScreen />;
  return <>{children}</>;
}

function useScreenTracking() {
  // Screen tracking placeholder - analytics can be added later
}

function RootLayout() {
  usePushNotifications();
  useScreenTracking();

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <OverlayProvider value={{ style: STREAM_THEME }}>
              <StatusBar style="dark" />
              <AuthGuard>
                <Slot />
              </AuthGuard>
            </OverlayProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default RootLayout;
