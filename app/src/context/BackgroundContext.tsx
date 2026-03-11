"use client";

import { createContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "@/context/useAuth";

const DEFAULT_BG = "/default_BG.jpg";

interface BackgroundContextType {
  backgroundUrl: string | null;
  setBackgroundUrl: (url: string | null) => void;
}

export const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [localOverride, setLocalOverride] = useState<string | null>(null);

  const effectiveUrl = localOverride ?? user?.backgroundUrl ?? DEFAULT_BG;

  useEffect(() => {
    document.body.classList.add("has-custom-bg");
    return () => document.body.classList.remove("has-custom-bg");
  }, []);

  const setBackgroundUrl = useCallback(
    (url: string | null) => {
      setLocalOverride(url ?? DEFAULT_BG);
      if (!user) return;
      if (url) {
        fetch("/api/profile/background", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ background: url }),
        })
          .then((r) => (r.ok ? refreshUser() : undefined))
          .then(() => setLocalOverride(null))
          .catch(() => setLocalOverride(null));
      } else {
        fetch("/api/profile/background", { method: "DELETE" })
          .then((r) => (r.ok ? refreshUser() : undefined))
          .then(() => setLocalOverride(null))
          .catch(() => setLocalOverride(null));
      }
    },
    [user, refreshUser]
  );

  return (
    <BackgroundContext.Provider value={{ backgroundUrl: effectiveUrl, setBackgroundUrl }}>
      <div
        id="bg-layer"
        className="fixed inset-0 -z-[1] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${effectiveUrl})` }}
        aria-hidden
      />
      {children}
    </BackgroundContext.Provider>
  );
}

