"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

/** Renders children into document.body to escape parent transforms/stacking contexts (e.g. for modals) */
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
