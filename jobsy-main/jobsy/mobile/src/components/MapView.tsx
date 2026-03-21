import { Text, View } from "react-native";
import Mapbox, {
  Camera,
  MapView as RNMapView,
  PointAnnotation,
} from "@rnmapbox/maps";

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

// Default center: Kingston, Jamaica
const DEFAULT_CENTER: [number, number] = [-77.297508, 18.109581];
const DEFAULT_ZOOM = 10;

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";

let mapboxReady = false;
try {
  if (MAPBOX_TOKEN) {
    Mapbox.setAccessToken(MAPBOX_TOKEN);
    mapboxReady = true;
  }
} catch {
  // Native module not linked (e.g. running in Expo Go)
}

/**
 * Mapbox GL map component.
 *
 * @rnmapbox/maps requires native module linking which is not available
 * in Expo Go. When the native module is missing a graceful fallback
 * is rendered instead.
 */
export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  markers = [],
  onPress,
  className,
}: MapViewProps) {
  if (!mapboxReady) {
    return (
      <View
        className={
          className ??
          "w-full h-64 rounded-lg bg-gray-100 items-center justify-center"
        }
      >
        <Text className="text-gray-500 text-sm text-center px-4">
          Map unavailable — native Mapbox module not linked.{"\n"}Run a
          development build to enable maps.
        </Text>
      </View>
    );
  }

  return (
    <View className={className ?? "w-full h-64 rounded-lg overflow-hidden"}>
      <RNMapView
        style={{ flex: 1 }}
        styleURL={Mapbox.StyleURL.Street}
        onPress={(feature) => {
          if (
            onPress &&
            feature.geometry.type === "Point"
          ) {
            const [lng, lat] = feature.geometry.coordinates;
            onPress({ lng, lat });
          }
        }}
      >
        <Camera
          zoomLevel={zoom}
          centerCoordinate={center}
          animationMode="flyTo"
          animationDuration={0}
        />

        {markers.map((m, i) => (
          <PointAnnotation
            key={`marker-${m.lng}-${m.lat}-${i}`}
            id={`marker-${i}`}
            coordinate={[m.lng, m.lat]}
            title={m.label}
          >
            <View />
          </PointAnnotation>
        ))}
      </RNMapView>
    </View>
  );
}
