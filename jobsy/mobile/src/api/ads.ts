import { api } from "./client";

export interface Ad {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  image_url: string;
  click_url: string;
  placement: string;
}

/**
 * Fetches an ad for the given placement. Returns null if no ad is available.
 */
export async function fetchAd(
  placement: string,
  parish?: string,
  category?: string,
): Promise<Ad | null> {
  try {
    const res = await api.get<Ad>(`/api/ads/serve/${placement}`, {
      params: { parish, category },
    });
    return res.data;
  } catch {
    // No ad available or server error, silently return null
    return null;
  }
}

/**
 * Records an impression for a campaign. Fire-and-forget; errors are swallowed
 * so ad tracking never disrupts the user experience.
 */
export async function recordImpression(
  campaignId: string,
  placementId?: string,
): Promise<void> {
  try {
    await api.post("/api/ads/impressions", {
      campaign_id: campaignId,
      placement_id: placementId,
    });
  } catch {
    // Silently ignore, impression tracking should not block UI
  }
}
