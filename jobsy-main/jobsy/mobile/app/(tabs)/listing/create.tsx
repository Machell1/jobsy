import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createListing, getListing, updateListing, ListingCreate, ListingUpdate } from "@/api/listings";
import { CategoryPicker } from "@/components/CategoryPicker";
import { ParishPicker } from "@/components/ParishPicker";
import { PhotoUploader } from "@/components/PhotoUploader";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useLocationStore } from "@/stores/location";

type PricingMode = "fixed" | "hourly";

export default function CreateListingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const location = useLocationStore();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditMode = !!editId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState("");
  const [pricingMode, setPricingMode] = useState<PricingMode>("fixed");
  const [price, setPrice] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [parish, setParish] = useState<string | null>(location.parish);
  const [photos, setPhotos] = useState<string[]>([]);

  // Load existing listing data for edit mode
  const { data: existingListing, isLoading: loadingExisting } = useQuery({
    queryKey: ["listing", editId],
    queryFn: () => getListing(editId!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingListing) {
      setTitle(existingListing.title || "");
      setDescription(existingListing.description || "");
      setCategory(existingListing.category || null);
      setSubcategory(existingListing.subcategory || "");
      setParish(existingListing.parish || null);
      if (existingListing.budget_min) setBudgetMin(String(existingListing.budget_min));
      if (existingListing.budget_max) setBudgetMax(String(existingListing.budget_max));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listing = existingListing as any;
      if (listing.pricing_mode) setPricingMode(listing.pricing_mode);
      if (listing.price) setPrice(String(listing.price));
      if (listing.images) setPhotos(listing.images);
    }
  }, [existingListing]);

  const createMutation = useMutation({
    mutationFn: (data: ListingCreate) => createListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing-feed"] });
      queryClient.invalidateQueries({ queryKey: ["search-listings"] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      router.back();
    },
    onError: () => Alert.alert("Error", "Failed to create listing"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ListingUpdate) => updateListing(editId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing", editId] });
      queryClient.invalidateQueries({ queryKey: ["listing-feed"] });
      queryClient.invalidateQueries({ queryKey: ["search-listings"] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      Alert.alert("Success", "Listing updated", [{ text: "OK", onPress: () => router.back() }]);
    },
    onError: () => Alert.alert("Error", "Failed to update listing"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!title.trim()) return Alert.alert("Required", "Title is required");
    if (!description.trim()) return Alert.alert("Required", "Description is required");
    if (!category) return Alert.alert("Required", "Select a category");

    if (isEditMode) {
      updateMutation.mutate({
        title: title.trim(),
        description: description.trim(),
        category,
        subcategory: subcategory.trim() || undefined,
        pricing_mode: pricingMode,
        price: price ? parseFloat(price) : undefined,
        budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
        parish: parish || undefined,
        images: photos.length > 0 ? photos : undefined,
      });
    } else {
      createMutation.mutate({
        title: title.trim(),
        description: description.trim(),
        category,
        subcategory: subcategory.trim() || undefined,
        pricing_mode: pricingMode,
        price: price ? parseFloat(price) : undefined,
        budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
        parish: parish || undefined,
        latitude: location.latitude || undefined,
        longitude: location.longitude || undefined,
        images: photos.length > 0 ? photos : undefined,
      });
    }
  };

  if (isEditMode && loadingExisting) return <LoadingScreen />;

  return (
    <ScrollView className="flex-1 bg-dark-50" keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isEditMode ? "Edit Listing" : "Post a Job" }} />

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

        {/* Subcategory */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Subcategory (optional)</Text>
        <TextInput
          value={subcategory}
          onChangeText={setSubcategory}
          placeholder="e.g. Bathroom plumbing, Interior painting"
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
          maxLength={100}
        />

        {/* Pricing Mode */}
        <Text className="mb-2 mt-4 text-sm font-semibold text-dark-700">Pricing Type</Text>
        <View className="flex-row gap-3 mb-2">
          <Pressable
            onPress={() => setPricingMode("fixed")}
            className={`flex-1 items-center rounded-xl border-2 py-3 ${
              pricingMode === "fixed" ? "border-primary-900 bg-primary-50" : "border-dark-200 bg-white"
            }`}
          >
            <Text className={`text-sm font-semibold ${pricingMode === "fixed" ? "text-primary-900" : "text-dark-500"}`}>
              Fixed Price
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPricingMode("hourly")}
            className={`flex-1 items-center rounded-xl border-2 py-3 ${
              pricingMode === "hourly" ? "border-primary-900 bg-primary-50" : "border-dark-200 bg-white"
            }`}
          >
            <Text className={`text-sm font-semibold ${pricingMode === "hourly" ? "text-primary-900" : "text-dark-500"}`}>
              Hourly Rate
            </Text>
          </Pressable>
        </View>

        {/* Price */}
        <Text className="mb-1.5 mt-2 text-sm font-semibold text-dark-700">
          {pricingMode === "hourly" ? "Hourly Rate (JMD)" : "Price (JMD)"}
        </Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder={pricingMode === "hourly" ? "e.g. 2500" : "e.g. 15000"}
          keyboardType="numeric"
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
        />

        {/* Budget Range */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Budget Range (JMD, optional)</Text>
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
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Service Area (Parish)</Text>
        <ParishPicker selected={parish} onSelect={setParish} />

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={isPending}
          className={`mt-6 items-center rounded-xl py-4 ${
            isPending ? "bg-primary-300" : "bg-primary-900"
          }`}
        >
          <Text className="text-base font-bold text-white">
            {isPending
              ? isEditMode ? "Updating..." : "Posting..."
              : isEditMode ? "Update Listing" : "Post Listing"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
