import { Dimensions, Image, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Listing } from "@/api/listings";
import { COLORS } from "@/constants/theme";
import { formatCurrency } from "@/utils/format";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

interface SwipeCardProps {
  listing: Listing;
  onSwipe: (direction: "left" | "right") => void;
  isFirst: boolean;
  index: number;
}

export function SwipeCard({ listing, onSwipe, isFirst, index }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .enabled(isFirst)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? "right" : "left";
        const dest = event.translationX > 0 ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
        translateX.value = withTiming(dest, { duration: 300 }, () => {
          runOnJS(onSwipe)(direction);
        });
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotation = interpolate(translateX.value, [-200, 0, 200], [-15, 0, 15]);
    const scale = isFirst ? 1 : interpolate(index, [1, 2], [0.95, 0.9]);
    const stackOffset = isFirst ? 0 : index * 10;

    return {
      transform: [
        { translateX: isFirst ? translateX.value : 0 },
        { translateY: isFirst ? translateY.value : stackOffset },
        { rotate: isFirst ? `${rotation}deg` : "0deg" },
        { scale },
      ],
    };
  });

  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  const nopeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));

  const budgetText =
    listing.budget_min && listing.budget_max
      ? `${formatCurrency(Number(listing.budget_min))} - ${formatCurrency(Number(listing.budget_max))}`
      : listing.budget_min
        ? `From ${formatCurrency(Number(listing.budget_min))}`
        : listing.budget_max
          ? `Up to ${formatCurrency(Number(listing.budget_max))}`
          : null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        className="absolute h-[75%] w-[90%] self-center overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={cardStyle}
      >
        {/* Placeholder image background */}
        <View className="flex-1 bg-primary-100 items-center justify-center">
          <Ionicons name="briefcase-outline" size={80} color={COLORS.primaryLight} />
        </View>

        {/* Like overlay */}
        <Animated.View
          className="absolute left-6 top-10 rounded-lg border-4 border-green-500 px-4 py-2"
          style={[likeOverlayStyle, { transform: [{ rotate: "-20deg" }] }]}
        >
          <Text className="text-2xl font-extrabold text-green-500">LIKE</Text>
        </Animated.View>

        {/* Nope overlay */}
        <Animated.View
          className="absolute right-6 top-10 rounded-lg border-4 border-red-500 px-4 py-2"
          style={[nopeOverlayStyle, { transform: [{ rotate: "20deg" }] }]}
        >
          <Text className="text-2xl font-extrabold text-red-500">NOPE</Text>
        </Animated.View>

        {/* Card info */}
        <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-5 py-4">
          <Text className="text-xl font-bold text-white" numberOfLines={1}>
            {listing.title}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <View className="rounded-full bg-primary-500 px-2 py-0.5">
              <Text className="text-xs font-medium text-white">{listing.category}</Text>
            </View>
            {listing.parish && (
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={14} color="white" />
                <Text className="ml-1 text-sm text-white">{listing.parish}</Text>
              </View>
            )}
          </View>
          {budgetText && (
            <Text className="mt-1 text-lg font-semibold text-gold-400">{budgetText}</Text>
          )}
          <Text className="mt-1 text-sm text-white/80" numberOfLines={2}>
            {listing.description}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
