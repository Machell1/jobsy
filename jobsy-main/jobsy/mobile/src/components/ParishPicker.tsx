import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import { PARISHES } from "@/constants/parishes";
import { COLORS } from "@/constants/theme";

interface ParishPickerProps {
  selected: string | null;
  onSelect: (parish: string) => void;
}

export function ParishPicker({ selected, onSelect }: ParishPickerProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        className="flex-row items-center justify-between rounded-xl border border-dark-200 bg-white px-4 py-3"
      >
        <Text className={selected ? "text-dark-800" : "text-dark-400"}>
          {selected || "Select Parish"}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.gray[500]} />
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[70%] rounded-t-3xl bg-white">
            <View className="flex-row items-center justify-between border-b border-dark-100 px-6 py-4">
              <Text className="text-lg font-bold text-dark-800">Select Parish</Text>
              <Pressable onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </Pressable>
            </View>
            <FlatList
              data={PARISHES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                  }}
                  className={`flex-row items-center justify-between px-6 py-4 ${
                    selected === item ? "bg-primary-50" : ""
                  }`}
                >
                  <Text
                    className={`text-base ${
                      selected === item ? "font-semibold text-primary-900" : "text-dark-700"
                    }`}
                  >
                    {item}
                  </Text>
                  {selected === item && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
