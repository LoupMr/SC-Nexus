"use client";

import { useRef, useCallback } from "react";

interface MobiglasParallaxProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

const RESET = "perspective(1200px) rotateX(0deg) rotateY(0deg)";

/** Subtle 3D tilt effect tied to mouse movement - mimics spatial hologram nature.
 *  Uses direct DOM updates (no state) to avoid re-rendering children on every mouse move. */
export default function MobiglasParallax({ children, className = "", intensity = 8 }: MobiglasParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      const rotateY = x * intensity;
      const rotateX = -y * intensity;
      el.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    },
    [intensity]
  );

  const handleMouseLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = RESET;
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: RESET,
        transformStyle: "preserve-3d",
        transition: "transform 0.15s ease-out",
      }}
    >
      {children}
    </div>
  );
}
