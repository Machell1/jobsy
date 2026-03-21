import * as Location from "expo-location";
import { create } from "zustand";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  parish: string | null;
  hasPermission: boolean;
  isLoading: boolean;
  requestLocation: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  parish: null,
  hasPermission: false,
  isLoading: false,

  requestLocation: async () => {
    set({ isLoading: true });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        set({ hasPermission: false, isLoading: false });
        return;
      }

      set({ hasPermission: true });
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get parish
      let parish: string | null = null;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo?.subregion) {
          parish = geo.subregion;
        } else if (geo?.region) {
          parish = geo.region;
        }
      } catch {
        // Reverse geocode is optional
      }

      set({ latitude, longitude, parish, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
