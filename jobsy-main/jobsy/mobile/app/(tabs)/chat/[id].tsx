import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Channel, MessageList, MessageInput } from "stream-chat-expo";
import type { Channel as ChannelType } from "stream-chat";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";

import { LoadingScreen } from "@/components/LoadingScreen";
import { useChatStore } from "@/stores/chat";
import { blockUser } from "@/api/trust";
import { COLORS } from "@/constants/theme";
import { formatCurrency } from "@/utils/format";

export default function ChatThreadScreen() {
  const { id: channelId } = useLocalSearchParams<{ id: string }>();
  const { client, isReady } = useChatStore();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [channel, setChannel] = useState<ChannelType<any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bookingData, setBookingData] = useState<any>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !channelId) return;

    const ch = client.channel("messaging", channelId);
    ch.watch().then(() => {
      setChannel(ch);

      // Extract booking context from channel data if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chData = ch.data as any;
      if (chData?.booking) {
        setBookingData(chData.booking);
      } else if (chData?.booking_id) {
        setBookingData({ id: chData.booking_id, title: chData.booking_title, status: chData.booking_status });
      }

      // Get the other user's ID from channel members
      const members = Object.values(ch.state.members || {});
      const currentUserId = client.userID;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const other = members.find((m: any) => m.user_id !== currentUserId);
      if (other) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setOtherUserId((other as any).user_id || (other as any).user?.id || null);
      }
    });
  }, [client, channelId]);

  const blockMutation = useMutation({
    mutationFn: () => blockUser(otherUserId!),
    onSuccess: () => {
      Alert.alert("Blocked", "This user has been blocked. You will no longer receive messages from them.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert("Error", "Failed to block user. Please try again."),
  });

  function handleBlockUser() {
    if (!otherUserId) {
      Alert.alert("Error", "Could not identify the other user.");
      return;
    }
    Alert.alert(
      "Block User",
      "Are you sure you want to block this user? You will no longer receive messages from them.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => blockMutation.mutate(),
        },
      ]
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
        options={{
          title: `Chat #${channelId?.slice(0, 8) || ""}`,
          headerRight: () => (
            <Pressable onPress={handleBlockUser} style={{ padding: 6 }}>
              <Ionicons name="ban-outline" size={22} color={COLORS.error} />
            </Pressable>
          ),
        }}
      />

      {/* Booking context card */}
      {bookingData && (
        <View
          style={{
            backgroundColor: '#EEF2FF',
            borderBottomWidth: 1,
            borderBottomColor: '#C7D2FE',
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: '#4338CA',
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}
          >
            <Ionicons name="briefcase" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E1B4B' }} numberOfLines={1}>
              {bookingData.title || `Booking #${bookingData.id?.slice(0, 8)}`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 8 }}>
              {bookingData.status && (
                <View style={{ backgroundColor: '#C7D2FE', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#4338CA', textTransform: 'capitalize' }}>
                    {bookingData.status}
                  </Text>
                </View>
              )}
              {bookingData.total_amount != null && (
                <Text style={{ fontSize: 11, color: '#4338CA', fontWeight: '600' }}>
                  {formatCurrency(bookingData.total_amount)}
                </Text>
              )}
              {bookingData.scheduled_date && (
                <Text style={{ fontSize: 11, color: '#6366F1' }}>
                  {new Date(bookingData.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/bookings" as never)}
            style={{ padding: 4 }}
          >
            <Ionicons name="chevron-forward" size={18} color="#4338CA" />
          </Pressable>
        </View>
      )}

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
