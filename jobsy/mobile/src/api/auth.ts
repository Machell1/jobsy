import axios from "axios";

import { API_URL } from "./client";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterData {
  phone: string;
  password: string;
  email?: string;
  role: "user" | "provider";
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
