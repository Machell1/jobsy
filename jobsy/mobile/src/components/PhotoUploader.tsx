import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { uploadFile } from "@/api/storage";
import { COLORS } from "@/constants/theme";

interface PhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  bucket?: string;
}

export function PhotoUploader({ photos, onChange, maxPhotos = 5, bucket = "listings" }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert("Limit reached", `Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploading(true);
    try {
      const { url } = await uploadFile(result.assets[0].uri, bucket);
      onChange([...photos, url]);
    } catch {
      Alert.alert("Upload failed", "Please try again");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
      {photos.map((uri, index) => (
        <View key={uri} className="relative mr-3">
          <Image source={{ uri }} className="h-24 w-24 rounded-xl" />
          <Pressable
            onPress={() => removePhoto(index)}
            className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-red-500"
          >
            <Ionicons name="close" size={14} color="white" />
          </Pressable>
        </View>
      ))}
      {photos.length < maxPhotos && (
        <Pressable
          onPress={pickImage}
          disabled={uploading}
          className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-dark-300"
        >
          <Ionicons
            name={uploading ? "hourglass" : "camera-outline"}
            size={28}
            color={COLORS.gray[500]}
          />
          <Text className="mt-1 text-xs text-dark-400">
            {uploading ? "Uploading..." : "Add Photo"}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
