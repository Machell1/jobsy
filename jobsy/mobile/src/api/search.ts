import { api } from "./client";

export interface SearchParams {
  q?: string;
  parish?: string;
  category?: string;
  listing_type?: string;
  lat?: number;
  lon?: number;
  radius_km?: number;
  limit?: number;
  offset?: number;
}

export interface ProfileSearchParams {
  q?: string;
  parish?: string;
  skills?: string;
  limit?: number;
  offset?: number;
}

export async function searchListings(params: SearchParams) {
  const res = await api.get("/api/search/listings", { params });
  return res.data;
}

export async function searchProfiles(params: ProfileSearchParams) {
  const res = await api.get("/api/search/profiles", { params });
  return res.data;
}

export async function getSuggestions(q: string, type: "listings" | "profiles" = "listings") {
  const res = await api.get("/api/search/suggest", { params: { q, type } });
  return res.data;
}
