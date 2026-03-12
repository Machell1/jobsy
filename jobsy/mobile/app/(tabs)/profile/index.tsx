import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { getMyProfile } from "@/api/profiles";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ReviewStars } from "@/components/ReviewStars";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { formatCurrency } from "@/utils/format";

const SOCIAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  instagram_url: "logo-instagram",
  twitter_url: "logo-twitter",
  tiktok_url: "logo-tiktok",
  youtube_url: "logo-youtube",
  linkedin_url: "logo-linkedin",
  portfolio_url: "globe-outline",
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
  });

  if (isLoading) return <LoadingScreen />;

  const socialLinks = profile
    ? Object.entries(SOCIAL_ICONS).filter(([key]) => profile[key as keyof typeof profile])
    : [];

  return (
    <ScrollView className="flex-1 bg-dark-50">
      <Stack.Screen options={{ title: "Profile" }} />

      {/* Header */}
      <View className="items-center bg-white px-6 pb-6 pt-12">
        <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary-100">
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} className="h-full w-full" />
          ) : (
            <Ionicons name="person" size={40} color={COLORS.primaryLight} />
          )}
        </View>
        <Text className="mt-3 text-xl font-bold text-dark-800">
          {profile?.display_name || "Set up your profile"}
        </Text>
        {profile?.service_category && (
          <Text className="mt-1 text-sm text-primary-700">{profile.service_category}</Text>
        )}
        <View className="mt-2 flex-row items-center gap-1">
          <ReviewStars rating={Number(profile?.rating_avg || 0)} size={16} />
          <Text className="text-sm text-dark-400">({profile?.rating_count || 0})</Text>
        </View>
        {profile?.hourly_rate && (
          <Text className="mt-1 text-lg font-bold text-primary-900">
            {formatCurrency(Number(profile.hourly_rate))}/hr
          </Text>
        )}

        {/* Follower stats */}
        <View className="mt-4 flex-row gap-8">
          <View className="items-center">
            <Text className="text-lg font-bold text-dark-800">{profile?.follower_count ?? 0}</Text>
            <Text className="text-xs text-dark-400">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-dark-800">{profile?.following_count ?? 0}</Text>
            <Text className="text-xs text-dark-400">Following</Text>
          </View>
        </View>

        {/* Social links */}
        {socialLinks.length > 0 && (
          <View className="mt-3 flex-row gap-4">
            {socialLinks.map(([key, icon]) => (
              <Pressable
                key={key}
                onPress={() => {
                  const url = profile?.[key as keyof typeof profile] as string;
                  if (url) Linking.openURL(url);
                }}
              >
                <Ionicons name={icon} size={22} color={COLORS.gray[600]} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Role Switcher */}
      <RoleSwitcher />

      {/* Bio */}
      {profile?.bio && (
        <View className="mx-4 mt-3 rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-dark-700">About</Text>
          <Text className="mt-1 text-sm text-dark-500">{profile.bio}</Text>
        </View>
      )}

      {/* Skills */}
      {profile?.skills && profile.skills.length > 0 && (
        <View className="mx-4 mt-3 rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-dark-700">Skills</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <View key={skill} className="rounded-lg bg-primary-50 px-3 py-1.5">
                <Text className="text-sm text-primary-900">{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Menu items */}
      <View className="mx-4 mt-4 rounded-2xl bg-white">
        <MenuItem
          icon="create-outline"
          label="Edit Profile"
          onPress={() => router.push("/(tabs)/profile/edit")}
        />
        <MenuItem
          icon="list-outline"
          label="My Listings"
          onPress={() => router.push("/(tabs)/listing/my-listings")}
        />
        <MenuItem
          icon="star-outline"
          label="My Reviews"
          onPress={() => router.push(`/(tabs)/reviews/${user?.id}`)}
        />
        <MenuItem
          icon="card-outline"
          label="Payments"
          onPress={() => router.push("/(tabs)/payments/")}
        />
        <MenuItem
          icon="notifications-outline"
          label="Notifications"
          onPress={() => router.push("/(tabs)/notifications")}
        />
        <MenuItem
          icon="share-social-outline"
          label="Share Profile"
          onPress={() => router.push("/(tabs)/profile/edit")}
        />
      </View>

      {/* Logout */}
      <Pressable
        onPress={logout}
        className="mx-4 mb-10 mt-4 items-center rounded-2xl bg-white py-4"
      >
        <Text className="font-semibold text-red-500">Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-dark-100 px-4 py-4 last:border-b-0"
    >
      <Ionicons name={icon} size={22} color={COLORS.gray[600]} />
      <Text className="ml-3 flex-1 text-base text-dark-700">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
    </Pressable>
  );
}
