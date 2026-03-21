import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { createEvent } from "@/api/events";
import { PhotoUploader } from "@/components/PhotoUploader";
import { ParishPicker } from "@/components/ParishPicker";
import { COLORS } from "@/constants/theme";

// ========== Constants ==========

const EVENT_CATEGORIES = [
  "Party",
  "Music",
  "Food & Drink",
  "Community",
  "Sports",
  "Arts & Culture",
  "Workshop",
  "Nightlife",
  "Festival",
  "Other",
];

// ========== Main Screen ==========

export default function CreateEventScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Party");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [locationText, setLocationText] = useState("");
  const [parish, setParish] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");

  const mutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      Alert.alert("Success", "Event created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: () =>
      Alert.alert("Error", "Failed to create event. Please try again."),
  });

  function handleSubmit() {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter an event title.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Required", "Please enter a description.");
      return;
    }
    if (!startDate.trim()) {
      Alert.alert("Required", "Please enter a start date (YYYY-MM-DD).");
      return;
    }
    if (!isFree && !price.trim()) {
      Alert.alert("Required", "Please enter a ticket price.");
      return;
    }

    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      start_date: startDate.trim(),
      start_time: startTime.trim() || undefined,
      end_date: endDate.trim() || undefined,
      end_time: endTime.trim() || undefined,
      location_text: locationText.trim() || undefined,
      parish: parish || undefined,
      cover_image: images[0] || undefined,
      images: images.length > 0 ? images : undefined,
      is_free: isFree,
      price: isFree ? undefined : Number(price),
      currency: "JMD",
      max_attendees: maxAttendees ? Number(maxAttendees) : undefined,
    });
  }

  // ========== Render ==========

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-3 border-b border-gray-200">
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={COLORS.gray[700]} />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Create Event</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text className="text-sm font-semibold text-gray-700 mb-1">
          Event Title *
        </Text>
        <TextInput
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 mb-4"
          placeholder="e.g., Beach Vibes Sunday"
          placeholderTextColor={COLORS.gray[400]}
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <Text className="text-sm font-semibold text-gray-700 mb-1">
          Description *
        </Text>
        <TextInput
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 mb-4"
          placeholder="Tell people about your event..."
          placeholderTextColor={COLORS.gray[400]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{ minHeight: 100 }}
        />

        {/* Category */}
        <Text className="text-sm font-semibold text-gray-700 mb-2">Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          {EVENT_CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                className={`mr-2 rounded-full px-4 py-2 ${
                  isSelected
                    ? "bg-primary-900"
                    : "bg-white border border-gray-200"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    isSelected ? "text-white" : "text-gray-700"
                  }`}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Date & Time */}
        <Text className="text-sm font-semibold text-gray-700 mb-1">
          Start Date * (YYYY-MM-DD)
        </Text>
        <TextInput
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 mb-4"
          placeholder="2026-04-15"
          placeholderTextColor={COLORS.gray[400]}
          value={startDate}
          onChangeText={setStartDate}
        />

        <View className="flex-row mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-semibold text-gray-700 mb-1">
              Start Time
            </Text>
            <TextInput
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900"
              placeholder="18:00"
              placeholderTextColor={COLORS.gray[400]}
              value={startTime}
              onChangeText={setStartTime}
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-sm font-semibold text-gray-700 mb-1">
              End Time
            </Text>
            <TextInput
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900"
              placeholder="23:00"
              placeholderTextColor={COLORS.gray[400]}
              value={endTime}
              onChangeText={setEndTime}
            />
          </View>
        </View>

        <Text className="text-sm font-semibold text-gray-700 mb-1">
          End Date (optional)
        </Text>
        <TextInput
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 mb-4"
          placeholder="2026-04-15"
          placeholderTextColor={COLORS.gray[400]}
          value={endDate}
          onChangeText={setEndDate}
        />

        {/* Location */}
        <Text className="text-sm font-semibold text-gray-700 mb-1">Location</Text>
        <TextInput
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 mb-4"
          placeholder="e.g., Hellshire Beach, Portmore"
          placeholderTextColor={COLORS.gray[400]}
          value={locationText}
          onChangeText={setLocationText}
        />

        {/* Parish */}
        <Text className="text-sm font-semibold text-gray-700 mb-1">Parish</Text>
        <View className="mb-4">
          <ParishPicker selected={parish} onSelect={setParish} />
        </View>

        {/* Photo Upload */}
        <Text className="text-sm font-semibold text-gray-700 mb-1">
          Event Photos
        </Text>
        <View className="mb-4">
          <PhotoUploader
            photos={images}
            onChange={setImages}
            maxPhotos={5}
            bucket="events"
          />
        </View>

        {/* Free / Paid Toggle */}
        <View className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mb-4">
          <Text className="text-sm font-semibold text-gray-700">Free Event</Text>
          <Switch
            value={isFree}
            onValueChange={setIsFree}
            trackColor={{ false: COLORS.gray[300], true: COLORS.primaryLight }}
            thumbColor={isFree ? COLORS.primary : COLORS.gray[400]}
          />
        </View>

        {!isFree && (
          <>
            <Text className="text-sm font-semibold text-gray-700 mb-1">
              Ticket Price (JMD) *
            </Text>
            <TextInput
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 mb-4"
              placeholder="e.g., 1500"
              placeholderTextColor={COLORS.gray[400]}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </>
        )}

        {/* Max Attendees */}
        <Text className="text-sm font-semibold text-gray-700 mb-1">
          Max Attendees (optional)
        </Text>
        <TextInput
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 mb-6"
          placeholder="Leave empty for unlimited"
          placeholderTextColor={COLORS.gray[400]}
          value={maxAttendees}
          onChangeText={setMaxAttendees}
          keyboardType="numeric"
        />

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={mutation.isPending}
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: COLORS.primary }}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Create Event
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
