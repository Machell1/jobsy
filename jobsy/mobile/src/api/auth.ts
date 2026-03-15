import axios from "axios";

import { API_URL } from "./client";

export type UserRole = "user" | "provider" | "hirer" | "advertiser";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  active_role: string;
  roles: string[];
}

export interface RegisterData {
  phone: string;
  password: string;
  email?: string;
  role: UserRole;
  roles?: UserRole[];
  display_name?: string;
}

export interface LoginData {
  phone: string;
  password: string;
}

// Auth endpoints don't use the interceptor-equipped client
// to avoid circular refresh loops
const authClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export async function register(data: RegisterData): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>("/auth/register", data);
  return res.data;
}

export async function login(data: LoginData): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>("/auth/login", data);
  return res.data;
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  return res.data;
}

// --- OAuth ---

export interface OAuthData {
  provider: "google" | "apple";
  id_token: string;
  role: UserRole;
  roles?: UserRole[];
}

export async function oauthAuthenticate(data: OAuthData): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>("/auth/oauth", data);
  return res.data;
}

// --- Role Management ---

export async function addRole(role: UserRole): Promise<void> {
  await authClient.post("/auth/roles/add", { role });
}

export async function switchRole(role: UserRole): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>("/auth/roles/switch", { role });
  return res.data;
}

export async function getMe(): Promise<{
  id: string;
  roles: string[];
  active_role: string;
  role: string;
}> {
  const res = await authClient.get("/auth/me");
  return res.data;
}

// --- Password Reset ---

export async function forgotPassword(phone: string): Promise<void> {
  await authClient.post("/auth/forgot-password", { phone });
}

export async function resetPassword(data: {
  phone: string;
  otp: string;
  new_password: string;
}): Promise<TokenResponse> {
  const res = await authClient.post<TokenResponse>("/auth/reset-password", data);
  return res.data;
}

export async function changePassword(data: {
  current_password: string;
  new_password: string;
}): Promise<void> {
  await authClient.post("/auth/change-password", data);
}

export async function deleteAccount(confirmation: string): Promise<void> {
  await authClient.delete("/auth/me", { data: { confirmation } });
}
