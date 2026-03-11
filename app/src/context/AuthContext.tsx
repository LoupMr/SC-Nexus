"use client";

import { createContext, useState, useEffect, useCallback, ReactNode } from "react";

export type UserRole = "viewer" | "admin" | "logistics" | "ops" | "raffle" | "guide";

export interface AppUser {
  username: string;
  role: UserRole;
  roles: string[];
  rank?: string;
  avatarUrl?: string | null;
  backgroundUrl?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  canEditLedger: boolean;
  canEditOps: boolean;
  canManageRaffle: boolean;
  canManageGuide: boolean;
  loading: boolean;
  passkey: string;
  login: (username: string, password: string) => Promise<string | null>;
  signup: (username: string, password: string, passkey: string) => Promise<string | null>;
  logout: () => Promise<void>;
  fetchPasskey: () => Promise<void>;
  regeneratePasskey: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me");
      const data = await r.json().catch(() => null);
      if (data?.username) {
        setUser({
          username: data.username,
          role: data.role,
          roles: data.roles ?? [data.role ?? "viewer"],
          rank: data.rank ?? "operator",
          avatarUrl: data.avatarUrl ?? null,
          backgroundUrl: data.backgroundUrl ?? null,
        });
      }
    } catch {
      // Ignore network/parse errors
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.username) {
          setUser({
            username: data.username,
            role: data.role,
            roles: data.roles ?? [data.role ?? "viewer"],
            rank: data.rank ?? "operator",
            avatarUrl: data.avatarUrl ?? null,
            backgroundUrl: data.backgroundUrl ?? null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Login failed";
    setUser({ username: data.username, role: data.role, roles: data.roles ?? [data.role ?? "viewer"], rank: data.rank ?? "operator", avatarUrl: data.avatarUrl ?? null, backgroundUrl: data.backgroundUrl ?? null });
    return null;
  }, []);

  const signup = useCallback(async (username: string, password: string, inputPasskey: string): Promise<string | null> => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, passkey: inputPasskey }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Signup failed";
    setUser({ username: data.username, role: data.role, roles: data.roles ?? [data.role ?? "viewer"], rank: data.rank ?? "operator", avatarUrl: data.avatarUrl ?? null, backgroundUrl: data.backgroundUrl ?? null });
    return null;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setPasskey("");
  }, []);

  const fetchPasskey = useCallback(async () => {
    const res = await fetch("/api/passkey");
    if (res.ok) {
      const data = await res.json();
      setPasskey(data.passkey);
    }
  }, []);

  const regeneratePasskey = useCallback(async () => {
    const res = await fetch("/api/passkey", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setPasskey(data.passkey);
    }
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{ user, refreshUser, isAdmin: (user?.roles?.includes("admin")) ?? false, canEditLedger: (user?.roles?.includes("admin") || user?.roles?.includes("logistics")) ?? false, canEditOps: (user?.roles?.includes("admin") || user?.roles?.includes("ops")) ?? false, canManageRaffle: (user?.roles?.includes("admin") || user?.roles?.includes("raffle")) ?? false, canManageGuide: (user?.roles?.includes("admin") || user?.roles?.includes("guide")) ?? false, loading, passkey, login, signup, logout, fetchPasskey, regeneratePasskey }}
    >
      {children}
    </AuthContext.Provider>
  );
}

