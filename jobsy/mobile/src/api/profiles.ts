import { api } from "./client";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  photos: string[];
  parish: string | null;
  service_category: string | null;
  skills: string[];
  hourly_rate: number | null;
  is_provider: boolean;
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
  created_at: string;
}

export interface ProfileUpdate {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  service_category?: string;
  skills?: string[];
  hourly_rate?: number;
  is_provider?: boolean;
  latitude?: number;
  longitude?: number;
  parish?: string;
}

export async function getMyProfile(): Promise<Profile> {
  const res = await api.get<Profile>("/api/profiles/me");
  return res.data;
}

export async function updateMyProfile(data: ProfileUpdate): Promise<Profile> {
  const res = await api.put<Profile>("/api/profiles/me", data);
  return res.data;
}

export async function getProfile(id: string): Promise<Profile> {
  const res = await api.get<Profile>(`/api/profiles/${id}`);
  return res.data;
}

export async function getNearbyProfiles(params: {
  lat: number;
  lng: number;
  radius_km?: number;
  limit?: number;
}): Promise<Profile[]> {
  const res = await api.get<Profile[]>("/api/profiles/nearby", { params });
  return res.data;
}
