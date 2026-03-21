import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Match } from "@/api/matches";
import { COLORS } from "@/constants/theme";
import { formatRelativeTime } from "@/utils/format";

interface MatchCardProps {
  match: Match;
  currentUserId: string;
  onPress: () => void;
}

export function MatchCard({ match, currentUserId, onPress }: MatchCardProps) {
  const otherUserId = match.user_a_id === currentUserId ? match.user_b_id : match.user_a_id;

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3 flex-row items-center rounded-2xl bg-white p-4 shadow-sm"
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-100">
        <Ionicons name="person" size={24} color={COLORS.primaryLight} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-dark-800">
          Match #{match.id.slice(0, 8)}
        </Text>
        <Text className="text-sm text-dark-500">
          User: {otherUserId.slice(0, 8)}...
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-xs text-dark-400">{formatRelativeTime(match.created_at)}</Text>
        <View className="mt-1 rounded-full bg-primary-50 px-2 py-0.5">
          <Text className="text-xs text-primary-800">{match.status}</Text>
        </View>
      </View>
    </Pressable>
  );
}
