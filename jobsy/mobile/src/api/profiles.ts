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
  is_hirer: boolean;
  is_advertiser: boolean;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  is_active: boolean;
  instagram_url: string | null;
  twitter_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  follower_count: number;
  following_count: number;
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
  is_hirer?: boolean;
  is_advertiser?: boolean;
  latitude?: number;
  longitude?: number;
  parish?: string;
  instagram_url?: string;
  twitter_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
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
  role?: string;
  limit?: number;
}): Promise<Profile[]> {
  const res = await api.get<Profile[]>("/api/profiles/nearby/search", { params });
  return res.data;
}

export async function followUser(userId: string): Promise<void> {
  await api.post("/api/profiles/follow", { user_id: userId });
}

export async function unfollowUser(userId: string): Promise<void> {
  await api.delete(`/api/profiles/follow/${userId}`);
}

export interface FollowerEntry {
  user_id: string;
  followed_at: string;
}

export async function getFollowers(userId: string): Promise<FollowerEntry[]> {
  const res = await api.get<FollowerEntry[]>(`/api/profiles/followers/${userId}`);
  return res.data;
}

export async function getFollowing(userId: string): Promise<FollowerEntry[]> {
  const res = await api.get<FollowerEntry[]>(`/api/profiles/following/${userId}`);
  return res.data;
}

export interface ShareLinks {
  profile_url: string;
  social_links: Record<string, string | null>;
  invite_links: Record<string, string>;
}

export async function getShareLinks(): Promise<ShareLinks> {
  const res = await api.get<ShareLinks>("/api/profiles/me/share-links");
  return res.data;
}
