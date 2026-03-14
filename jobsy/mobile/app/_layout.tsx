import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, usePathname, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider } from "posthog-react-native";
import { OverlayProvider } from "stream-chat-expo";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/LoadingScreen";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { posthog } from "@/lib/posthog";
import { useAuthStore } from "@/stores/auth";
import { useChatStore } from "@/stores/chat";

import "../global.css";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  tracesSampleRate: 0.2,
  enabled: !__DEV__,
});

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
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      posthog?.screen(pathname, { previous: prevPathname.current });
      prevPathname.current = pathname;
    }
  }, [pathname]);
}

function RootLayout() {
  usePushNotifications();
  useScreenTracking();

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {posthog ? (
          <PostHogProvider client={posthog}>
            <QueryClientProvider client={queryClient}>
              <OverlayProvider value={{ style: STREAM_THEME }}>
                <StatusBar style="dark" />
                <AuthGuard>
                  <Slot />
                </AuthGuard>
              </OverlayProvider>
            </QueryClientProvider>
          </PostHogProvider>
        ) : (
          <QueryClientProvider client={queryClient}>
            <OverlayProvider value={{ style: STREAM_THEME }}>
              <StatusBar style="dark" />
              <AuthGuard>
                <Slot />
              </AuthGuard>
            </OverlayProvider>
          </QueryClientProvider>
        )}
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
