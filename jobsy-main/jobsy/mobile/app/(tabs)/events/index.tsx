import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getEvents, type EventItem } from "@/api/events";
import { useAuthStore } from "@/stores/auth";
import { EmptyState } from "@/components/EmptyState";
import { COLORS } from "@/constants/theme";

// ========== Constants ==========

const FILTERS = ["All", "Happening Now", "This Weekend", "Free"] as const;
type FilterName = (typeof FILTERS)[number];

const PARISHES = [
  "All",
  "Kingston",
  "St. Andrew",
  "St. Catherine",
  "Clarendon",
  "Manchester",
  "St. Elizabeth",
  "Westmoreland",
  "Hanover",
  "St. James",
  "Trelawny",
  "St. Ann",
  "St. Mary",
  "Portland",
  "St. Thomas",
];

// ========== Helpers ==========

function formatEventDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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

export default function EventsScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterName>("All");
  const [selectedParish, setSelectedParish] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  // Build query params based on filters
  const queryParams: Record<string, string> = {};
  if (searchQuery.trim()) queryParams.search = searchQuery.trim();
  if (activeFilter === "Happening Now") queryParams.status = "happening_now";
  if (activeFilter === "This Weekend") queryParams.period = "this_weekend";
  if (activeFilter === "Free") queryParams.is_free = "true";
  if (selectedParish !== "All") queryParams.parish = selectedParish;

  const {
    data: events = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["events", queryParams],
    queryFn: () => getEvents(queryParams),
    enabled: isAuthenticated,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // ========== Render Helpers ==========

  function renderEventCard({ item }: { item: EventItem }) {
    return (
      <Pressable
        className="bg-white mx-4 mb-3 rounded-xl overflow-hidden"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={() => router.push(`/(tabs)/events/${item.id}`)}
      >
        {/* Cover Image */}
        {item.cover_image ? (
          <Image
            source={{ uri: item.cover_image }}
            className="w-full h-40"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-40 bg-gray-200 items-center justify-center">
            <Ionicons name="calendar-outline" size={48} color={COLORS.gray[400]} />
          </View>
        )}

        <View className="p-4">
          {/* Title & Price Badge */}
          <View className="flex-row items-center justify-between mb-1">
            <Text
              className="text-base font-semibold text-gray-900 flex-1 mr-2"
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <View
              className="rounded-full px-3 py-1"
              style={{
                backgroundColor: item.is_free ? "#DCFCE7" : "#DBEAFE",
              }}
            >
              <Text
                style={{
                  color: item.is_free ? "#166534" : "#1E40AF",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {item.is_free
                  ? "Free"
                  : `J$${item.price?.toLocaleString() ?? "—"}`}
              </Text>
            </View>
          </View>

          {/* Date */}
          <View className="flex-row items-center mt-1">
            <Ionicons name="calendar-outline" size={14} color={COLORS.gray[500]} />
            <Text className="text-sm text-gray-500 ml-1">
              {formatEventDate(item.start_date)}
              {item.start_time ? ` at ${formatEventTime(item.start_time)}` : ""}
            </Text>
          </View>

          {/* Location */}
          {item.location_text && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="location-outline" size={14} color={COLORS.gray[500]} />
              <Text className="text-sm text-gray-500 ml-1" numberOfLines={1}>
                {item.location_text}
                {item.parish ? `, ${item.parish}` : ""}
              </Text>
            </View>
          )}

          {/* Attendee count */}
          <View className="flex-row items-center mt-1">
            <Ionicons name="people-outline" size={14} color={COLORS.gray[500]} />
            <Text className="text-sm text-gray-500 ml-1">
              {item.attendee_count} attending
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // ========== Main Render ==========

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search Bar */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-3 py-2">
          <Ionicons name="search" size={20} color={COLORS.gray[400]} />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900"
            placeholder="Search events..."
            placeholderTextColor={COLORS.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <FlatList
        horizontal
        data={FILTERS as unknown as FilterName[]}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          const isActive = activeFilter === item;
          return (
            <Pressable
              onPress={() => setActiveFilter(item)}
              className={`mr-2 rounded-full px-4 py-2 ${
                isActive ? "bg-primary-900" : "bg-white border border-gray-200"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isActive ? "text-white" : "text-gray-700"
                }`}
              >
                {item}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Parish Filter */}
      <FlatList
        horizontal
        data={PARISHES}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          const isActive = selectedParish === item;
          return (
            <Pressable
              onPress={() => setSelectedParish(item)}
              className={`mr-2 rounded-full px-3 py-1.5 ${
                isActive ? "bg-green-100 border border-green-600" : "bg-white border border-gray-200"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isActive ? "text-green-800" : "text-gray-600"
                }`}
              >
                {item}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Events List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          subtitle="Pull down to try again"
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventCard}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No events found"
              subtitle="Check back later or create your own event"
            />
          }
        />
      )}

      {/* FAB — Create Event */}
      <Pressable
        onPress={() => router.push("/(tabs)/events/create")}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full"
        style={{
          backgroundColor: COLORS.primary,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </View>
  );
}
