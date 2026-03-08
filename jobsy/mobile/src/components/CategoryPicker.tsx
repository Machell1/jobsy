import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { SERVICE_CATEGORIES } from "@/constants/categories";
import { COLORS } from "@/constants/theme";

interface CategoryPickerProps {
  selected: string | null;
  onSelect: (category: string) => void;
  horizontal?: boolean;
}

export function CategoryPicker({ selected, onSelect, horizontal = false }: CategoryPickerProps) {
  return (
    <FlatList
      data={SERVICE_CATEGORIES}
      horizontal={horizontal}
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.key}
      contentContainerStyle={horizontal ? { paddingHorizontal: 16 } : { padding: 16 }}
      numColumns={horizontal ? undefined : 3}
      renderItem={({ item }) => {
        const isSelected = selected === item.key;
        return (
          <Pressable
            onPress={() => onSelect(item.key)}
            className={`m-1 items-center rounded-xl px-3 py-2 ${
              isSelected ? "bg-primary-900" : "bg-dark-50"
            }`}
            style={horizontal ? undefined : { flex: 1 }}
          >
            <Ionicons
              name={item.icon as keyof typeof Ionicons.glyphMap}
              size={horizontal ? 18 : 24}
              color={isSelected ? COLORS.white : COLORS.gray[600]}
            />
            <Text
              className={`mt-1 text-xs ${isSelected ? "font-semibold text-white" : "text-dark-600"}`}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}
