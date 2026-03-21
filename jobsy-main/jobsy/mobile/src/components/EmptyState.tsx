import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = "albums-outline", title, subtitle }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Ionicons name={icon} size={64} color={COLORS.gray[400]} />
      <Text className="mt-4 text-lg font-semibold text-dark-700">{title}</Text>
      {subtitle && (
        <Text className="mt-2 text-center text-sm text-dark-400">{subtitle}</Text>
      )}
    </View>
  );
}
