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

// Tags
export async function addTag(data: { user_id: string; tag: string }) {
  const { data: res } = await api.post('/api/profiles/tag', data);
  return res;
}
export async function getUserTags(userId: string) {
  const { data } = await api.get(`/api/profiles/tags/${userId}`);
  return data;
}
export async function deleteTag(tagId: string) {
  await api.delete(`/api/profiles/tag/${tagId}`);
}

// Verification
export async function submitVerification(documentUrls: string[]) {
  const { data } = await api.post('/api/profiles/verification/submit', { document_urls: documentUrls });
  return data;
}
export async function getVerificationStatus() {
  const { data } = await api.get('/api/profiles/verification/status');
  return data;
}

// Services
export interface ServiceData {
  name: string;
  description?: string;
  category?: string;
  price?: number;
  pricing_mode?: "fixed" | "hourly";
  duration_minutes?: number;
  is_active?: boolean;
}

export async function getMyServices() {
  const { data } = await api.get('/api/profiles/services/mine');
  return data;
}
export async function createService(svcData: ServiceData) {
  const { data } = await api.post('/api/profiles/services', svcData);
  return data;
}
export async function updateService(id: string, svcData: Partial<ServiceData>) {
  const { data } = await api.put(`/api/profiles/services/${id}`, svcData);
  return data;
}
export async function deleteService(id: string) {
  await api.delete(`/api/profiles/services/${id}`);
}

// Packages
export interface PackageData {
  name: string;
  description?: string;
  price: number;
  features?: string[];
  duration_minutes?: number;
  is_active?: boolean;
}

export async function getServicePackages(serviceId: string) {
  const { data } = await api.get(`/api/profiles/services/${serviceId}/packages`);
  return data;
}
export async function createPackage(serviceId: string, pkgData: PackageData) {
  const { data } = await api.post(`/api/profiles/services/${serviceId}/packages`, pkgData);
  return data;
}
export async function updatePackage(packageId: string, pkgData: Partial<PackageData>) {
  const { data } = await api.put(`/api/profiles/packages/${packageId}`, pkgData);
  return data;
}
export async function deletePackage(packageId: string) {
  await api.delete(`/api/profiles/packages/${packageId}`);
}

// Availability
export interface AvailabilitySchedule {
  timezone?: string;
  slots: {
    day: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }[];
}

export async function getMyAvailability() {
  const { data } = await api.get('/api/profiles/availability/me');
  return data;
}
export async function updateAvailability(schedule: AvailabilitySchedule) {
  const { data } = await api.put('/api/profiles/availability', schedule);
  return data;
}

// Portfolio
export interface PortfolioItemData {
  title: string;
  description?: string;
  image_url?: string;
  project_url?: string;
  tags?: string[];
}

export async function getMyPortfolio() {
  const { data } = await api.get('/api/profiles/me/portfolio');
  return data;
}
export async function addPortfolioItem(item: PortfolioItemData) {
  const { data } = await api.post('/api/profiles/me/portfolio', item);
  return data;
}
export async function updatePortfolioItem(itemId: string, item: Partial<PortfolioItemData>) {
  const { data } = await api.put(`/api/profiles/me/portfolio/${itemId}`, item);
  return data;
}
export async function deletePortfolioItem(itemId: string) {
  await api.delete(`/api/profiles/me/portfolio/${itemId}`);
}

// Share link (generate)
export async function generateShareLink() {
  const { data } = await api.post('/api/profiles/me/share-link');
  return data;
}

// Provider analytics
export async function getProviderAnalytics() {
  const { data } = await api.get('/api/profiles/me/analytics');
  return data;
}

// Categories
export async function getCategories() {
  const { data } = await api.get('/api/profiles/categories');
  return data;
}
