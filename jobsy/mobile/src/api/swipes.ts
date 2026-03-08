import { api } from "./client";

export interface SwipeCreate {
  target_id: string;
  target_type: "listing" | "profile";
  direction: "left" | "right";
}

export interface SwipeResponse {
  id: string;
  swiper_id: string;
  target_id: string;
  target_type: string;
  direction: string;
  created_at: string;
}

export async function recordSwipe(data: SwipeCreate): Promise<SwipeResponse> {
  const res = await api.post<SwipeResponse>("/api/swipes/", data);
  return res.data;
}

export async function getSwipeHistory(params?: {
  limit?: number;
  offset?: number;
}): Promise<SwipeResponse[]> {
  const res = await api.get<SwipeResponse[]>("/api/swipes/history", { params });
  return res.data;
}
