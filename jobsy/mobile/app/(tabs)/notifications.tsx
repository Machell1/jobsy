import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  Notification,
} from "@/api/notifications";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";
import { formatRelativeTime } from "@/utils/format";

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  match: "heart",
  message: "chatbubble",
  payment: "card",
  review: "star",
  system: "information-circle",
};

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ limit: 50 }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) return <LoadingScreen />;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <View className="flex-1 bg-dark-50">
      {unreadCount > 0 && (
        <Pressable
          onPress={() => markAllRead.mutate()}
          className="mx-4 mt-2 items-end"
        >
          <Text className="text-sm font-medium text-primary-900">Mark all read</Text>
        </Pressable>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item: Notification) => item.id}
        renderItem={({ item }) => {
          const icon = TYPE_ICONS[item.type] || "notifications";
          return (
            <Pressable
              onPress={() => !item.is_read && markRead.mutate(item.id)}
              className={`mx-4 mb-2 flex-row items-start rounded-2xl p-4 ${
                item.is_read ? "bg-white" : "bg-primary-50"
              }`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                <Ionicons name={icon} size={20} color={COLORS.primary} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-dark-800">{item.title}</Text>
                <Text className="mt-0.5 text-sm text-dark-500">{item.body}</Text>
                <Text className="mt-1 text-xs text-dark-400">
                  {formatRelativeTime(item.sent_at)}
                </Text>
              </View>
              {!item.is_read && (
                <View className="mt-1 h-2.5 w-2.5 rounded-full bg-primary-500" />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No notifications"
            subtitle="You're all caught up"
          />
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, flexGrow: 1 }}
      />
    </View>
  );
}
