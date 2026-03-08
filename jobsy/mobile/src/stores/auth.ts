import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import * as authApi from "@/api/auth";

interface User {
  id: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: authApi.RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync("access_token");
      if (accessToken) {
        const payload = parseJwt(accessToken);
        if (payload && payload.sub) {
          set({
            user: { id: payload.sub as string, role: (payload.role as string) || "user" },
            isAuthenticated: true,
          });
        }
      }
    } catch {
      // Token invalid or expired, will be refreshed on first API call
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (phone, password) => {
    const tokens = await authApi.login({ phone, password });
    await SecureStore.setItemAsync("access_token", tokens.access_token);
    await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);

    const payload = parseJwt(tokens.access_token);
    set({
      user: {
        id: (payload?.sub as string) || "",
        role: (payload?.role as string) || "user",
      },
      isAuthenticated: true,
    });
  },

  register: async (data) => {
    const tokens = await authApi.register(data);
    await SecureStore.setItemAsync("access_token", tokens.access_token);
    await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);

    const payload = parseJwt(tokens.access_token);
    set({
      user: {
        id: (payload?.sub as string) || "",
        role: (payload?.role as string) || data.role,
      },
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    set({ user: null, isAuthenticated: false });
  },
}));
