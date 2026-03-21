import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";

import { uploadFile, type UploadResult } from "@/api/storage";
import { COLORS } from "@/constants/theme";

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".webm"];

function isVideoUri(uri: string): boolean {
  const lower = uri.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface MediaItem {
  uri: string;
  thumbnailUri?: string;
  type: "image" | "video";
  duration?: number;
  fileSize?: number;
}

/** Props for the new MediaUploader (backward-compatible with PhotoUploader) */
interface MediaUploaderProps {
  /** Array of media URLs (images and/or videos). Backward-compatible with string[]. */
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  bucket?: string;
  /** Media items with richer metadata (optional, for new consumers) */
  mediaItems?: MediaItem[];
  onMediaChange?: (items: MediaItem[]) => void;
  /** Which media types to allow */
  mediaTypes?: "images" | "videos" | "all";
}

/**
 * MediaUploader — supports both image and video upload.
 *
 * Backward-compatible: the old `PhotoUploader` name and props still work.
 * New consumers can use `mediaItems` / `onMediaChange` for richer metadata.
 */
export function MediaUploader({
  photos,
  onChange,
  maxPhotos = 5,
  bucket = "listings",
  mediaItems,
  onMediaChange,
  mediaTypes = "all",
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const resolvedItems: MediaItem[] =
    mediaItems ??
    photos.map((uri) => ({
      uri,
      type: isVideoUri(uri) ? ("video" as const) : ("image" as const),
    }));

  const pickerMediaTypes =
    mediaTypes === "images"
      ? ImagePicker.MediaTypeOptions.Images
      : mediaTypes === "videos"
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.All;

  const pickMedia = async () => {
    if (resolvedItems.length >= maxPhotos) {
      Alert.alert("Limit reached", `Maximum ${maxPhotos} items allowed`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: pickerMediaTypes,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      videoMaxDuration: 120,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const isVideo = asset.type === "video" || isVideoUri(asset.uri);

    // Check file size for videos (100MB limit)
    if (isVideo && asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
      Alert.alert("File too large", "Videos must be under 100MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const uploadResult: UploadResult = await uploadFile(
        asset.uri,
        bucket,
        (percent) => setUploadProgress(percent),
      );

      const newItem: MediaItem = {
        uri: uploadResult.url,
        thumbnailUri: uploadResult.thumbnail_url,
        type: isVideo ? "video" : "image",
        duration: uploadResult.duration ?? asset.duration ?? undefined,
        fileSize: uploadResult.size ?? asset.fileSize ?? undefined,
      };

      const updatedItems = [...resolvedItems, newItem];
      onChange(updatedItems.map((item) => item.uri));
      onMediaChange?.(updatedItems);
    } catch {
      Alert.alert("Upload failed", "Please try again");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeItem = (index: number) => {
    const updatedItems = resolvedItems.filter((_, i) => i !== index);
    onChange(updatedItems.map((item) => item.uri));
    onMediaChange?.(updatedItems);
  };

  const actionLabel =
    mediaTypes === "images"
      ? "Add Photo"
      : mediaTypes === "videos"
        ? "Add Video"
        : "Add Media";

  const actionIcon =
    mediaTypes === "videos" ? "videocam-outline" : "camera-outline";

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
      {resolvedItems.map((item, index) => (
        <View key={`${item.uri}-${index}`} className="relative mr-3">
          {item.type === "video" ? (
            <View className="h-24 w-24 rounded-xl overflow-hidden bg-black">
              {item.thumbnailUri ? (
                <Image source={{ uri: item.thumbnailUri }} className="h-24 w-24" />
              ) : (
                <Video
                  source={{ uri: item.uri }}
                  style={{ width: 96, height: 96 }}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                  isMuted
                />
              )}
              {/* Play icon overlay */}
              <View className="absolute inset-0 items-center justify-center">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-black/50">
                  <Ionicons name="play" size={16} color="white" />
                </View>
              </View>
              {/* Duration / file size badge */}
              {(item.duration || item.fileSize) && (
                <View className="absolute bottom-1 left-1 rounded bg-black/60 px-1">
                  <Text className="text-white" style={{ fontSize: 9 }}>
                    {item.duration
                      ? `${Math.round(item.duration)}s`
                      : item.fileSize
                        ? formatFileSize(item.fileSize)
                        : ""}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Image source={{ uri: item.uri }} className="h-24 w-24 rounded-xl" />
          )}
          <Pressable
            onPress={() => removeItem(index)}
            className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-red-500"
          >
            <Ionicons name="close" size={14} color="white" />
          </Pressable>
        </View>
      ))}
      {resolvedItems.length < maxPhotos && (
        <Pressable
          onPress={pickMedia}
          disabled={uploading}
          className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-dark-300"
        >
          {uploading ? (
            <>
              <Ionicons name="hourglass" size={28} color={COLORS.gray[500]} />
              <Text className="mt-1 text-xs text-dark-400">{uploadProgress}%</Text>
            </>
          ) : (
            <>
              <Ionicons name={actionIcon as any} size={28} color={COLORS.gray[500]} />
              <Text className="mt-1 text-xs text-dark-400">{actionLabel}</Text>
            </>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

/**
 * @deprecated Use `MediaUploader` instead. This is a backward-compatible alias.
 */
export function PhotoUploader(props: Omit<MediaUploaderProps, "mediaTypes">) {
  return <MediaUploader {...props} mediaTypes="images" />;
}
