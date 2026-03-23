import { api } from "./client";

export interface Listing {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  latitude: number | null;
  longitude: number | null;
  geohash: string | null;
  parish: string | null;
  address_text: string | null;
  status: string;
  created_at: string;
}

export interface ListingCreate {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  pricing_mode?: "fixed" | "hourly";
  price?: number;
  budget_min?: number;
  budget_max?: number;
  currency?: string;
  latitude?: number;
  longitude?: number;
  parish?: string;
  address_text?: string;
  images?: string[];
}

export interface ListingUpdate {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  pricing_mode?: "fixed" | "hourly";
  price?: number;
  budget_min?: number;
  budget_max?: number;
  parish?: string;
  images?: string[];
  status?: string;
}

export async function getListings(params?: {
  category?: string;
  parish?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Listing[]> {
  const res = await api.get<Listing[]>("/api/listings/", { params });
  return res.data;
}

export async function getListingFeed(limit = 20): Promise<Listing[]> {
  const res = await api.get<Listing[]>("/api/listings/feed", { params: { limit } });
  return res.data;
}

export async function getMyListings(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Listing[]> {
  const res = await api.get<Listing[]>("/api/listings/mine", { params });
  return res.data;
}

export async function getListing(id: string): Promise<Listing> {
  const res = await api.get<Listing>(`/api/listings/${id}`);
  return res.data;
}

export async function createListing(data: ListingCreate): Promise<Listing> {
  const res = await api.post<Listing>("/api/listings/", data);
  return res.data;
}

export async function updateListing(id: string, data: ListingUpdate): Promise<Listing> {
  const res = await api.put<Listing>(`/api/listings/${id}`, data);
  return res.data;
}

export async function deleteListing(id: string): Promise<void> {
  await api.delete(`/api/listings/${id}`);
}
