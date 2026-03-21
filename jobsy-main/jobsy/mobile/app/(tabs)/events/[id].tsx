import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import {
  getEvent,
  rsvpEvent,
  cancelRsvp,
  buyTickets,
  type EventItem,
} from "@/api/events";
import { useAuthStore } from "@/stores/auth";
import { COLORS } from "@/constants/theme";

// ========== Helpers ==========

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTime(timeStr?: string) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

// ========== Main Screen ==========

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const {
    data: event,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEvent(id!),
    enabled: isAuthenticated && !!id,
  });

  const rsvpMutation = useMutation({
    mutationFn: () => rsvpEvent(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      Alert.alert("Success", "You have RSVP'd to this event!");
    },
    onError: () => Alert.alert("Error", "Failed to RSVP. Please try again."),
  });

  const cancelRsvpMutation = useMutation({
    mutationFn: () => cancelRsvp(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      Alert.alert("Cancelled", "Your RSVP has been cancelled.");
    },
    onError: () => Alert.alert("Error", "Failed to cancel RSVP."),
  });

  const buyTicketMutation = useMutation({
    mutationFn: () => buyTickets(id!, { quantity: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      Alert.alert("Success", "Ticket purchased successfully!");
    },
    onError: () => Alert.alert("Error", "Failed to purchase ticket."),
  });

  async function handleShare() {
    if (!event) return;
    try {
      await Share.share({
        title: event.title,
        message: `Check out this event: ${event.title}`,
      });
    } catch {
      // User cancelled
    }
  }

  function handleRsvp() {
    if (event?.is_rsvped) {
      Alert.alert("Cancel RSVP", "Are you sure you want to cancel your RSVP?", [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: () => cancelRsvpMutation.mutate() },
      ]);
    } else {
      rsvpMutation.mutate();
    }
  }

  function handleBuyTicket() {
    Alert.alert(
      "Buy Ticket",
      `Purchase 1 ticket for J$${event?.price?.toLocaleString() ?? "0"}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Buy", onPress: () => buyTicketMutation.mutate() },
      ],
    );
  }

  // ========== Loading / Error States ==========

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.gray[400]} />
        <Text className="mt-4 text-lg font-semibold text-gray-700">
          Event not found
        </Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-base font-medium" style={{ color: COLORS.primary }}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const isMutating =
    rsvpMutation.isPending ||
    cancelRsvpMutation.isPending ||
    buyTicketMutation.isPending;

  // ========== Main Render ==========

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Cover Image */}
        {event.cover_image ? (
          <Image
            source={{ uri: event.cover_image }}
            className="w-full h-56"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-56 bg-gray-200 items-center justify-center">
            <Ionicons name="calendar-outline" size={64} color={COLORS.gray[400]} />
          </View>
        )}

        {/* Back Button Overlay */}
        <Pressable
          onPress={() => router.back()}
          className="absolute top-12 left-4 h-10 w-10 items-center justify-center rounded-full bg-black/40"
        >
          <Ionicons name="arrow-back" size={22} color="white" />
        </Pressable>

        {/* Share Button Overlay */}
        <Pressable
          onPress={handleShare}
          className="absolute top-12 right-4 h-10 w-10 items-center justify-center rounded-full bg-black/40"
        >
          <Ionicons name="share-outline" size={22} color="white" />
        </Pressable>

        <View className="px-4 pt-4 pb-32">
          {/* Title */}
          <Text className="text-2xl font-bold text-gray-900">{event.title}</Text>

          {/* Category Tag */}
          {event.category && (
            <View className="mt-2 self-start rounded-full bg-gray-100 px-3 py-1">
              <Text className="text-xs font-medium text-gray-600">
                {event.category}
              </Text>
            </View>
          )}

          {/* Date & Time */}
          <View className="flex-row items-center mt-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
            </View>
            <View className="ml-3">
              <Text className="text-sm font-semibold text-gray-900">
                {formatEventDate(event.start_date)}
              </Text>
              <Text className="text-xs text-gray-500">
                {formatEventTime(event.start_time)
                  ? `${formatEventTime(event.start_time)}${
                      event.end_time
                        ? ` - ${formatEventTime(event.end_time)}`
                        : ""
                    }`
                  : "Time TBA"}
              </Text>
            </View>
          </View>

          {/* Location */}
          {event.location_text && (
            <View className="flex-row items-center mt-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                <Ionicons name="location" size={20} color={COLORS.primary} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-gray-900">
                  {event.location_text}
                </Text>
                {event.parish && (
                  <Text className="text-xs text-gray-500">{event.parish}</Text>
                )}
              </View>
            </View>
          )}

          {/* Attendees */}
          <View className="flex-row items-center mt-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Ionicons name="people" size={20} color={COLORS.primary} />
            </View>
            <View className="ml-3">
              <Text className="text-sm font-semibold text-gray-900">
                {event.attendee_count} attending
              </Text>
              {event.max_attendees && (
                <Text className="text-xs text-gray-500">
                  {event.max_attendees - event.attendee_count} spots left
                </Text>
              )}
            </View>
          </View>

          {/* Price */}
          <View className="flex-row items-center mt-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <Ionicons name="pricetag" size={20} color={COLORS.primary} />
            </View>
            <View className="ml-3">
              <Text className="text-sm font-semibold text-gray-900">
                {event.is_free
                  ? "Free Event"
                  : `J$${event.price?.toLocaleString() ?? "—"}`}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View className="mt-6">
            <Text className="text-base font-semibold text-gray-900 mb-2">
              About this event
            </Text>
            <Text className="text-sm text-gray-600 leading-5">
              {event.description}
            </Text>
          </View>

          {/* Organizer */}
          {event.organizer && (
            <View className="mt-6">
              <Text className="text-base font-semibold text-gray-900 mb-2">
                Organizer
              </Text>
              <View className="flex-row items-center">
                {event.organizer.avatar_url ? (
                  <Image
                    source={{ uri: event.organizer.avatar_url }}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <View className="h-10 w-10 rounded-full bg-gray-200 items-center justify-center">
                    <Ionicons name="person" size={20} color={COLORS.gray[400]} />
                  </View>
                )}
                <Text className="ml-3 text-sm font-medium text-gray-900">
                  {event.organizer.display_name}
                </Text>
              </View>
            </View>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <View className="mt-6">
              <Text className="text-base font-semibold text-gray-900 mb-2">Tags</Text>
              <View className="flex-row flex-wrap">
                {event.tags.map((tag) => (
                  <View
                    key={tag}
                    className="mr-2 mb-2 rounded-full bg-gray-100 px-3 py-1"
                  >
                    <Text className="text-xs text-gray-600">{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white px-4 py-4 border-t border-gray-200"
        style={{
          paddingBottom: 28,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        }}
      >
        {event.is_free ? (
          <Pressable
            onPress={handleRsvp}
            disabled={isMutating}
            className="rounded-xl py-4 items-center"
            style={{
              backgroundColor: event.is_rsvped ? COLORS.gray[200] : COLORS.primary,
            }}
          >
            {isMutating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                className="text-base font-semibold"
                style={{ color: event.is_rsvped ? COLORS.gray[700] : "white" }}
              >
                {event.is_rsvped ? "Cancel RSVP" : "RSVP — Free"}
              </Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={handleBuyTicket}
            disabled={isMutating || event.has_ticket}
            className="rounded-xl py-4 items-center"
            style={{
              backgroundColor: event.has_ticket ? COLORS.gray[200] : COLORS.primary,
            }}
          >
            {isMutating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                className="text-base font-semibold"
                style={{ color: event.has_ticket ? COLORS.gray[700] : "white" }}
              >
                {event.has_ticket
                  ? "Ticket Purchased"
                  : `Buy Ticket — J$${event.price?.toLocaleString() ?? "—"}`}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
