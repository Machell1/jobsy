import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";

interface ReviewStarsProps {
  rating: number;
  size?: number;
  editable?: boolean;
  onChange?: (rating: number) => void;
}

export function ReviewStars({ rating, size = 18, editable = false, onChange }: ReviewStarsProps) {
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(rating);
        const icon = filled ? "star" : "star-outline";
        return (
          <Pressable
            key={star}
            onPress={editable ? () => onChange?.(star) : undefined}
            disabled={!editable}
          >
            <Ionicons name={icon} size={size} color={COLORS.gold} />
          </Pressable>
        );
      })}
    </View>
  );
}
