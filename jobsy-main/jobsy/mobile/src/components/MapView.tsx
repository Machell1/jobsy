import { Text, View } from "react-native";

interface Marker {
  lng: number;
  lat: number;
  label?: string;
}

interface MapViewProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  markers?: Marker[];
  onPress?: (coords: { lng: number; lat: number }) => void;
  className?: string;
}

/**
 * Map placeholder component.
 *
 * Native Mapbox maps temporarily removed due to Android build
 * compatibility issues with Expo SDK 55. Maps will be re-added
 * post-launch via an OTA update once the @rnmapbox/maps Kotlin
 * compilation issue is resolved upstream.
 */
export default function MapView({
  className,
}: MapViewProps) {
  return (
    <View
      className={
        className ??
        "w-full h-64 rounded-lg bg-gray-100 items-center justify-center"
      }
    >
      <Text className="text-gray-500 text-sm text-center px-4">
        Map view coming soon
      </Text>
    </View>
  );
}
