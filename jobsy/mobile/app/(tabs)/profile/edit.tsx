import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getMyProfile, updateMyProfile, ProfileUpdate } from "@/api/profiles";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ParishPicker } from "@/components/ParishPicker";
import { PhotoUploader } from "@/components/PhotoUploader";
import { COLORS } from "@/constants/theme";

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

  // Social media links
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setServiceCategory(profile.service_category || "");
      setSkills(profile.skills?.join(", ") || "");
      setHourlyRate(profile.hourly_rate?.toString() || "");
      setParish(profile.parish || null);
      setPhotos(profile.photos || []);
      setInstagramUrl(profile.instagram_url || "");
      setTwitterUrl(profile.twitter_url || "");
      setTiktokUrl(profile.tiktok_url || "");
      setYoutubeUrl(profile.youtube_url || "");
      setLinkedinUrl(profile.linkedin_url || "");
      setPortfolioUrl(profile.portfolio_url || "");
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
      instagram_url: instagramUrl || undefined,
      twitter_url: twitterUrl || undefined,
      tiktok_url: tiktokUrl || undefined,
      youtube_url: youtubeUrl || undefined,
      linkedin_url: linkedinUrl || undefined,
      portfolio_url: portfolioUrl || undefined,
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

        {/* Social Media Links */}
        <Text className="mb-3 mt-6 text-base font-bold text-dark-800">Social Media Links</Text>

        <SocialInput
          icon="logo-instagram"
          label="Instagram"
          value={instagramUrl}
          onChange={setInstagramUrl}
          placeholder="https://instagram.com/yourprofile"
        />
        <SocialInput
          icon="logo-twitter"
          label="Twitter / X"
          value={twitterUrl}
          onChange={setTwitterUrl}
          placeholder="https://twitter.com/yourhandle"
        />
        <SocialInput
          icon="logo-tiktok"
          label="TikTok"
          value={tiktokUrl}
          onChange={setTiktokUrl}
          placeholder="https://tiktok.com/@yourhandle"
        />
        <SocialInput
          icon="logo-youtube"
          label="YouTube"
          value={youtubeUrl}
          onChange={setYoutubeUrl}
          placeholder="https://youtube.com/@yourchannel"
        />
        <SocialInput
          icon="logo-linkedin"
          label="LinkedIn"
          value={linkedinUrl}
          onChange={setLinkedinUrl}
          placeholder="https://linkedin.com/in/yourprofile"
        />
        <SocialInput
          icon="globe-outline"
          label="Portfolio / Website"
          value={portfolioUrl}
          onChange={setPortfolioUrl}
          placeholder="https://yourwebsite.com"
        />

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

function SocialInput({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm text-dark-600">{label}</Text>
      <View className="flex-row items-center rounded-xl border border-dark-200 bg-white px-3 py-2.5">
        <Ionicons name={icon} size={20} color={COLORS.gray[500]} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          autoCapitalize="none"
          keyboardType="url"
          className="ml-2.5 flex-1 text-sm text-dark-800"
        />
      </View>
    </View>
  );
}
