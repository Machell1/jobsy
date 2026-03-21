import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Profile } from "@/api/profiles";
import { COLORS } from "@/constants/theme";
import { formatCurrency } from "@/utils/format";

import { ReviewStars } from "./ReviewStars";

interface ProfileCardProps {
  profile: Profile;
  onPress: () => void;
}

export function ProfileCard({ profile, onPress }: ProfileCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3 flex-row rounded-2xl bg-white p-4 shadow-sm"
    >
      {/* Avatar */}
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-100">
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} className="h-full w-full" />
        ) : (
          <Ionicons name="person" size={28} color={COLORS.primaryLight} />
        )}
      </View>

      {/* Info */}
      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-dark-800">{profile.display_name}</Text>
        {profile.service_category && (
          <Text className="text-sm text-primary-700">{profile.service_category}</Text>
        )}
        <View className="mt-1 flex-row items-center gap-2">
          <ReviewStars rating={Number(profile.rating_avg)} size={14} />
          <Text className="text-xs text-dark-400">({profile.rating_count})</Text>
        </View>
        {profile.skills.length > 0 && (
          <View className="mt-1 flex-row flex-wrap gap-1">
            {profile.skills.slice(0, 3).map((skill) => (
              <View key={skill} className="rounded bg-dark-50 px-1.5 py-0.5">
                <Text className="text-xs text-dark-600">{skill}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Rate */}
      {profile.hourly_rate && (
        <View className="items-end">
          <Text className="text-base font-bold text-primary-900">
            {formatCurrency(Number(profile.hourly_rate))}
          </Text>
          <Text className="text-xs text-dark-400">/hr</Text>
        </View>
      )}
    </Pressable>
  );
}
