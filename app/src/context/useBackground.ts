"use client";

import { useContext } from "react";
import { BackgroundContext } from "@/context/BackgroundContext";

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (!context) throw new Error("useBackground must be used within BackgroundProvider");
  return context;
}
