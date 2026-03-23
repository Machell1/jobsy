"use client";

/**
 * AuthProvider — wraps children with authentication context.
 *
 * This is a stub that provides a minimal auth context shape.
 * Replace the internals once Supabase Auth or your auth solution
 * is wired up.
 */

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

/* ─── Types ───────────────────────────────────────────────── */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "client" | "provider" | "admin";
  avatarUrl?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

/* ─── Context ─────────────────────────────────────────────── */

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

/* ─── Provider ────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<AuthUser | null>(null);
  const [loading] = useState(false);

  const signOut = async () => {
    // TODO: Implement sign out with Supabase
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
