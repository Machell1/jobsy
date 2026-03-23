import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import * as authApi from "@/api/auth";
import type { UserRole } from "@/api/auth";
import { getMyProfile } from "@/api/profiles";

interface User {
  id: string;
  role: string;
  roles: string[];
  activeRole: string;
  displayName: string;
  phone: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
  parish: string | null;
  isVerified: boolean;
  account_type?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: authApi.RegisterData) => Promise<void>;
  oauthLogin: (
    provider: "google" | "apple",
    idToken: string,
    role?: UserRole,
  ) => Promise<void>;
  resetPassword: (data: {
    phone: string;
    otp: string;
    new_password: string;
  }) => Promise<void>;
  addRole: (role: UserRole) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(payload: Record<string, unknown>): boolean {
  const exp = payload.exp;
  if (typeof exp !== "number") return true;
  return Date.now() >= exp * 1000;
}

function setAuthFromTokens(
  tokens: authApi.TokenResponse,
  set: (state: Partial<AuthState>) => void,
  fallbackRole = "user",
) {
  const payload = parseJwt(tokens.access_token);
  const roles = (payload?.roles as string[]) || tokens.roles || [fallbackRole];
  const activeRole = (payload?.active_role as string) || tokens.active_role || fallbackRole;
  set({
    user: {
      id: (payload?.sub as string) || "",
      role: (payload?.role as string) || fallbackRole,
      roles,
      activeRole,
      displayName: "",
      phone: "",
      email: "",
      bio: "",
      avatarUrl: null,
      parish: null,
      isVerified: false,
    },
    isAuthenticated: true,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync("access_token");
      if (accessToken) {
        const payload = parseJwt(accessToken);
        if (payload && payload.sub && !isTokenExpired(payload)) {
          const userId = payload.sub as string;
          const role = (payload.role as string) || "user";
          const roles = (payload.roles as string[]) || ["user"];
          const activeRole = (payload.active_role as string) || role;

          set({
            user: {
              id: userId,
              role,
              roles,
              activeRole,
              displayName: "",
              phone: "",
              email: "",
              bio: "",
              avatarUrl: null,
              parish: null,
              isVerified: false,
            },
            isAuthenticated: true,
          });

          // Enrich with profile in background
          try {
            const profile = await getMyProfile();
            set({
              user: {
                id: userId,
                role,
                roles,
                activeRole,
                displayName: profile.display_name || "",
                phone: "",
                email: "",
                bio: profile.bio || "",
                avatarUrl: profile.avatar_url || null,
                parish: profile.parish || null,
                isVerified: profile.is_verified || false,
              },
            });
          } catch {
            // Profile may not exist yet
          }
        } else {
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");
        }
      }
    } catch {
      // Token invalid or expired
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (phone, password) => {
    const tokens = await authApi.login({ phone, password });
    await SecureStore.setItemAsync("access_token", tokens.access_token);
    await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);
    setAuthFromTokens(tokens, set);
  },

  register: async (data) => {
    const tokens = await authApi.register(data);
    await SecureStore.setItemAsync("access_token", tokens.access_token);
    await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);
    setAuthFromTokens(tokens, set, data.role);
  },

  oauthLogin: async (provider, idToken, role = "user") => {
    const tokens = await authApi.oauthAuthenticate({
      provider,
      id_token: idToken,
      role,
    });
    await SecureStore.setItemAsync("access_token", tokens.access_token);
    await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);
    setAuthFromTokens(tokens, set, role);
  },

  resetPassword: async (data) => {
    const tokens = await authApi.resetPassword(data);
    await SecureStore.setItemAsync("access_token", tokens.access_token);
    await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);
    setAuthFromTokens(tokens, set);
  },

  addRole: async (role: UserRole) => {
    await authApi.addRole(role);
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: {
          ...currentUser,
          roles: [...new Set([...currentUser.roles, role])].sort(),
        },
      });
    }
  },

  switchRole: async (role: UserRole) => {
    const tokens = await authApi.switchRole(role);
    await SecureStore.setItemAsync("access_token", tokens.access_token);
    await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);
    await setAuthFromTokens(tokens, set, role);
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    set({ user: null, isAuthenticated: false });
  },
}));
