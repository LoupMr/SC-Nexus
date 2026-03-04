"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type UserRole = "viewer" | "admin" | "logistics" | "ops";

export interface AppUser {
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: AppUser | null;
  isAdmin: boolean;
  canEditLedger: boolean;
  canEditOps: boolean;
  loading: boolean;
  passkey: string;
  login: (username: string, password: string) => Promise<string | null>;
  signup: (username: string, password: string, passkey: string) => Promise<string | null>;
  logout: () => Promise<void>;
  fetchPasskey: () => Promise<void>;
  regeneratePasskey: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.username) setUser({ username: data.username, role: data.role });
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
    setUser({ username: data.username, role: data.role });
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
    setUser({ username: data.username, role: data.role });
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
      value={{ user, isAdmin: user?.role === "admin", canEditLedger: user?.role === "admin" || user?.role === "logistics", canEditOps: user?.role === "admin" || user?.role === "ops", loading, passkey, login, signup, logout, fetchPasskey, regeneratePasskey }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
