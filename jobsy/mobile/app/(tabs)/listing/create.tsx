import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createListing, ListingCreate } from "@/api/listings";
import { CategoryPicker } from "@/components/CategoryPicker";
import { ParishPicker } from "@/components/ParishPicker";
import { PhotoUploader } from "@/components/PhotoUploader";
import { useLocationStore } from "@/stores/location";

export default function CreateListingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const location = useLocationStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [parish, setParish] = useState<string | null>(location.parish);
  const [photos, setPhotos] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: (data: ListingCreate) => createListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing-feed"] });
      queryClient.invalidateQueries({ queryKey: ["search-listings"] });
      router.back();
    },
    onError: () => Alert.alert("Error", "Failed to create listing"),
  });

  const handleSubmit = () => {
    if (!title.trim()) return Alert.alert("Required", "Title is required");
    if (!description.trim()) return Alert.alert("Required", "Description is required");
    if (!category) return Alert.alert("Required", "Select a category");

    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
      budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
      parish: parish || undefined,
      latitude: location.latitude || undefined,
      longitude: location.longitude || undefined,
    });
  };

  return (
    <ScrollView className="flex-1 bg-dark-50" keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Post a Job" }} />

      <View className="p-4">
        {/* Photos */}
        <Text className="mb-2 text-sm font-semibold text-dark-700">Photos</Text>
        <PhotoUploader photos={photos} onChange={setPhotos} />

        {/* Title */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What do you need done?"
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
          maxLength={200}
        />

        {/* Description */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the job in detail..."
          multiline
          numberOfLines={5}
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
          style={{ textAlignVertical: "top", minHeight: 120 }}
        />

        {/* Category */}
        <Text className="mb-2 mt-4 text-sm font-semibold text-dark-700">Category</Text>
        <CategoryPicker selected={category} onSelect={setCategory} horizontal />

        {/* Budget */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Budget Range (JMD)</Text>
        <View className="flex-row gap-3">
          <TextInput
            value={budgetMin}
            onChangeText={setBudgetMin}
            placeholder="Min"
            keyboardType="numeric"
            className="flex-1 rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
          />
          <TextInput
            value={budgetMax}
            onChangeText={setBudgetMax}
            placeholder="Max"
            keyboardType="numeric"
            className="flex-1 rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
          />
        </View>

        {/* Parish */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Parish</Text>
        <ParishPicker selected={parish} onSelect={setParish} />

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={mutation.isPending}
          className={`mt-6 items-center rounded-xl py-4 ${
            mutation.isPending ? "bg-primary-300" : "bg-primary-900"
          }`}
        >
          <Text className="text-base font-bold text-white">
            {mutation.isPending ? "Posting..." : "Post Listing"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
