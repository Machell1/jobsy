import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMyProfile, updateMyProfile, ProfileUpdate } from "@/api/profiles";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ParishPicker } from "@/components/ParishPicker";
import { PhotoUploader } from "@/components/PhotoUploader";

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
  });

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [skills, setSkills] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [parish, setParish] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setServiceCategory(profile.service_category || "");
      setSkills(profile.skills?.join(", ") || "");
      setHourlyRate(profile.hourly_rate?.toString() || "");
      setParish(profile.parish || null);
      setPhotos(profile.photos || []);
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (data: ProfileUpdate) => updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      router.back();
    },
    onError: () => Alert.alert("Error", "Failed to update profile"),
  });

  const handleSave = () => {
    mutation.mutate({
      display_name: displayName,
      bio: bio || undefined,
      service_category: serviceCategory || undefined,
      skills: skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      parish: parish || undefined,
      avatar_url: photos[0] || undefined,
    });
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <ScrollView className="flex-1 bg-dark-50" keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Edit Profile" }} />

      <View className="p-4">
        {/* Photos */}
        <Text className="mb-2 text-sm font-semibold text-dark-700">Photos</Text>
        <PhotoUploader photos={photos} onChange={setPhotos} bucket="avatars" />

        {/* Display Name */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Display Name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
        />

        {/* Bio */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people about yourself..."
          multiline
          numberOfLines={4}
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
          style={{ textAlignVertical: "top", minHeight: 100 }}
        />

        {/* Service Category */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Service Category</Text>
        <TextInput
          value={serviceCategory}
          onChangeText={setServiceCategory}
          placeholder="e.g., plumbing, electrical"
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
        />

        {/* Skills */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Skills (comma separated)</Text>
        <TextInput
          value={skills}
          onChangeText={setSkills}
          placeholder="e.g., pipe repair, tiling, welding"
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
        />

        {/* Hourly Rate */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Hourly Rate (JMD)</Text>
        <TextInput
          value={hourlyRate}
          onChangeText={setHourlyRate}
          placeholder="e.g., 2500"
          keyboardType="numeric"
          className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-base"
        />

        {/* Parish */}
        <Text className="mb-1.5 mt-4 text-sm font-semibold text-dark-700">Parish</Text>
        <ParishPicker selected={parish} onSelect={setParish} />

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={mutation.isPending}
          className={`mt-6 items-center rounded-xl py-4 ${
            mutation.isPending ? "bg-primary-300" : "bg-primary-900"
          }`}
        >
          <Text className="text-base font-bold text-white">
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
