import React, { useState, useEffect } from "react";
import { FlatList, Modal, Pressable, Switch, Text, View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  getNotificationPreferences,
  updateNotificationPreferences,
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

const PREF_CATEGORIES = ["Messages", "Bookings", "Payments", "Reviews", "Marketing"] as const;
const PREF_CHANNELS = ["push", "email", "in_app"] as const;
const CHANNEL_LABELS: Record<string, string> = {
  push: "Push",
  email: "Email",
  in_app: "In-App",
};

type PrefKey = `${string}_${string}`;

function buildDefaultPrefs(): Record<PrefKey, boolean> {
  const prefs: Record<PrefKey, boolean> = {};
  for (const cat of PREF_CATEGORIES) {
    for (const ch of PREF_CHANNELS) {
      prefs[`${cat.toLowerCase()}_${ch}` as PrefKey] = true;
    }
  }
  return prefs;
}

function prefsToPayload(prefs: Record<PrefKey, boolean>) {
  const payload: Record<string, Record<string, boolean>> = {};
  for (const cat of PREF_CATEGORIES) {
    const key = cat.toLowerCase();
    payload[key] = {};
    for (const ch of PREF_CHANNELS) {
      payload[key][ch] = prefs[`${key}_${ch}` as PrefKey] ?? true;
    }
  }
  return payload;
}

function apiPrefsToState(data: any): Record<PrefKey, boolean> {
  const prefs = buildDefaultPrefs();
  if (!data) return prefs;
  for (const cat of PREF_CATEGORIES) {
    const key = cat.toLowerCase();
    if (data[key]) {
      for (const ch of PREF_CHANNELS) {
        prefs[`${key}_${ch}` as PrefKey] = data[key][ch] ?? true;
      }
    }
  }
  return prefs;
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<Record<PrefKey, boolean>>(buildDefaultPrefs());

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ limit: 50 }),
  });

  const { data: prefsData, isLoading: loadingPrefs } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: getNotificationPreferences,
    enabled: showPrefsModal,
  });

  useEffect(() => {
    if (prefsData) setLocalPrefs(apiPrefsToState(prefsData));
  }, [prefsData]);

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const savePrefs = useMutation({
    mutationFn: () => updateNotificationPreferences(prefsToPayload(localPrefs)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
      setShowPrefsModal(false);
      Alert.alert("Saved", "Notification preferences updated.");
    },
    onError: () => Alert.alert("Error", "Failed to save preferences."),
  });

  function openPrefsModal() {
    // Pre-populate with current API data if available
    if (prefsData) {
      setLocalPrefs(apiPrefsToState(prefsData));
    }
    setShowPrefsModal(true);
  }

  if (isLoading) return <LoadingScreen />;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <View className="flex-1 bg-dark-50">
      <Stack.Screen
        options={{
          title: "Notifications",
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {unreadCount > 0 && (
                <Pressable
                  onPress={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  <Text className="text-sm font-medium text-primary-900">Mark all read</Text>
                </Pressable>
              )}
              <Pressable onPress={openPrefsModal}>
                <Ionicons name="options-outline" size={22} color={COLORS.primary} />
              </Pressable>
            </View>
          ),
        }}
      />
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

      {/* Preferences Modal */}
      <Modal
        visible={showPrefsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrefsModal(false)}
      >
        <View className="flex-1 bg-gray-50">
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              paddingTop: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
              backgroundColor: '#fff',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Notification Preferences</Text>
            <Pressable onPress={() => setShowPrefsModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </Pressable>
          </View>

          {loadingPrefs ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {/* Channel header row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1 }} />
                {PREF_CHANNELS.map((ch) => (
                  <View key={ch} style={{ width: 68, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>
                      {CHANNEL_LABELS[ch]}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Category rows */}
              {PREF_CATEGORIES.map((cat, idx) => (
                <View
                  key={cat}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: '#F3F4F6',
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' }}>{cat}</Text>
                  {PREF_CHANNELS.map((ch) => {
                    const prefKey = `${cat.toLowerCase()}_${ch}` as PrefKey;
                    return (
                      <View key={ch} style={{ width: 68, alignItems: 'center' }}>
                        <Switch
                          value={localPrefs[prefKey]}
                          onValueChange={(val) =>
                            setLocalPrefs((prev) => ({ ...prev, [prefKey]: val }))
                          }
                          trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                          thumbColor="#fff"
                          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}

              <Pressable
                onPress={() => savePrefs.mutate()}
                style={{
                  marginTop: 8,
                  backgroundColor: COLORS.primary,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
                disabled={savePrefs.isPending}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  {savePrefs.isPending ? 'Saving...' : 'Save Preferences'}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}
