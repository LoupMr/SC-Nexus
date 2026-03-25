"use client";

import { useAuth } from "@/context/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import MobiglasHeader from "@/components/MobiglasHeader";
import MobiglasDock from "@/components/MobiglasDock";

const PUBLIC_ROUTES = ["/", "/login"];
const isGuideRoute = (path: string) => path === "/guide" || path.startsWith("/guide/");

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || isGuideRoute(pathname);

  useEffect(() => {
    if (!user && !isPublicRoute) {
      router.replace("/login");
    }
    if (user && pathname === "/login") {
      router.replace("/dashboard");
    }
    if (user && pathname === "/") {
      router.replace("/dashboard");
    }
  }, [user, pathname, router, isPublicRoute]);

  if (!user && !isPublicRoute) {
    return null;
  }

  const isPublicPage = pathname === "/" || pathname === "/login" || isGuideRoute(pathname);
  const maxWidth = isPublicPage ? "max-w-4xl" : "max-w-7xl";
  const mainClass = isPublicPage ? "public-content pt-14 pb-20 md:pb-24 min-h-screen" : "pt-14 pb-20 md:pb-24 min-h-screen";
  const padding = isPublicPage ? "px-4 sm:px-6 py-8" : "px-4 sm:px-6 lg:px-8 py-6";

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-holo focus:text-space-black focus:chamfer-sm focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>
      <MobiglasHeader />
      <MobiglasDock isAdmin={isAdmin} onLogout={logout} />
      <main id="main-content" className={`${mainClass} transition-all duration-300 mobiglas-canvas`}>
        <div className={`${maxWidth} mx-auto ${padding} relative z-10`}>
          {children}
        </div>
      </main>
    </>
  );
}
