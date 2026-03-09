import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, Linking } from "react-native";

import { Ad, fetchAd, recordImpression } from "@/api/ads";
import { COLORS } from "@/constants/theme";

interface AdBannerProps {
  placement: string;
  parish?: string;
  category?: string;
}

export default function AdBanner({ placement, parish, category }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [impressionTracked, setImpressionTracked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAd() {
      const result = await fetchAd(placement, parish, category);
      if (!cancelled) {
        setAd(result);
        setImpressionTracked(false);
      }
    }

    loadAd();
    return () => {
      cancelled = true;
    };
  }, [placement, parish, category]);

  // Track impression once when ad becomes visible
  useEffect(() => {
    if (ad && !impressionTracked) {
      recordImpression(ad.campaign_id, ad.id);
      setImpressionTracked(true);
    }
  }, [ad, impressionTracked]);

  if (!ad) return null;

  function handlePress() {
    if (ad?.click_url) {
      Linking.openURL(ad.click_url);
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      className="mx-4 mb-3 overflow-hidden rounded-2xl bg-white shadow-sm"
    >
      {ad.image_url ? (
        <Image
          source={{ uri: ad.image_url }}
          className="h-32 w-full"
          resizeMode="cover"
        />
      ) : null}

      <View className="p-3">
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-sm font-bold text-dark-800" numberOfLines={1}>
            {ad.title}
          </Text>
          <Text
            className="ml-2 text-xs text-dark-400"
            style={{ color: COLORS.gray[400] }}
          >
            Sponsored
          </Text>
        </View>

        {ad.description ? (
          <Text className="mt-1 text-xs text-dark-500" numberOfLines={2}>
            {ad.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
