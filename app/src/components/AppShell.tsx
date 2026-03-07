"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";

const PUBLIC_ROUTES = ["/", "/login"];
const isGuideRoute = (path: string) => path === "/guide" || path.startsWith("/guide/");

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
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

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (pathname === "/") {
    return <>{children}</>;
  }

  if (!user && isGuideRoute(pathname)) {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 z-30 h-14 border-b border-glass-border bg-space-900/90 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-space-400 hover:text-holo transition-colors">← Home</Link>
            <Link href="/guide" className="text-sm font-bold text-holo">SC-NEXUS Guides</Link>
          </div>
          <Link href="/login" className="text-sm text-space-400 hover:text-holo transition-colors">Log in</Link>
        </header>
        <main className="pt-14 min-h-screen">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Sidebar />
      <main className="pl-16 lg:pl-[72px] xl:pl-64 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </>
  );
}
