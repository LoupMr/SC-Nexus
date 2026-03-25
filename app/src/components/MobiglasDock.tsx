"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Crosshair, BookMarked, BookOpen, Medal, UserCheck, Link2, Users, Home, LogOut, LogIn, Rocket, ScrollText, ClipboardList } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/useAuth";

const dockItems = [
  { href: "/dashboard", label: "Home", icon: Home, adminOnly: false },
  { href: "/armory", label: "Armory", icon: Crosshair, adminOnly: false },
  { href: "/missions", label: "Missions", icon: ClipboardList, adminOnly: false },
  { href: "/ships", label: "Ships", icon: Rocket, adminOnly: false },
  { href: "/guide", label: "Guides", icon: BookMarked, adminOnly: false },
  { href: "/ledger", label: "Ledger", icon: BookOpen, adminOnly: false },
  { href: "/blueprints", label: "Prints", icon: ScrollText, adminOnly: false },
  { href: "/conquest-ops", label: "Ops", icon: Shield, adminOnly: false },
  { href: "/merits", label: "Merits", icon: Medal, adminOnly: false },
  { href: "/roster", label: "Roster", icon: UserCheck, adminOnly: false },
  { href: "/links", label: "Links", icon: Link2, adminOnly: false },
  { href: "/members", label: "Members", icon: Users, adminOnly: true },
];

const guestDockItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/guide", label: "Guides", icon: BookMarked },
  { href: "/login", label: "Enter Portal", icon: LogIn },
];

export default function MobiglasDock({ isAdmin, onLogout }: { isAdmin: boolean; onLogout: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const items = user ? dockItems.filter((item) => !item.adminOnly || isAdmin) : guestDockItems;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full px-4 md:px-6 py-3 border-t border-glass-border mobiglas-header-bg backdrop-blur-xl shadow-[0_0_16px_rgba(92,225,230,0.08)]"
      aria-label="App launcher"
    >
      <div className="flex items-center w-full gap-1 md:gap-2 py-1 overflow-x-auto scrollbar-hide">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center justify-center chamfer-sm flex-1 min-w-[2.5rem] h-12 md:h-14 border transition-all duration-200",
                isActive
                  ? "bg-holo/15 border-holo/40 text-holo shadow-[0_0_12px_rgba(92,225,230,0.35)]"
                  : "bg-space-900/40 border-glass-border text-space-400 hover:border-holo/30 hover:text-holo hover:shadow-[0_0_8px_rgba(92,225,230,0.2)]"
              )}
            >
              <item.icon
                className={clsx(
                  "w-5 h-5 md:w-6 md:h-6 flex-shrink-0",
                  isActive && "drop-shadow-[0_0_6px_rgba(92,225,230,0.6)]"
                )}
              />
              <span className="text-[9px] md:text-[10px] mt-0.5 mobiglas-label hidden sm:block truncate max-w-full px-1">
                {item.label}
              </span>
            </Link>
          );
        })}
        {user && (
          <button
            onClick={onLogout}
            title="Logout"
            aria-label="Logout"
            className="flex flex-col items-center justify-center chamfer-sm flex-1 min-w-[2.5rem] h-12 md:h-14 border border-glass-border bg-space-900/40 text-space-400 hover:border-alert/30 hover:text-alert hover:shadow-[0_0_8px_rgba(255,75,106,0.2)] transition-all duration-200"
          >
            <LogOut className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
            <span className="text-[9px] md:text-[10px] mt-0.5 mobiglas-label hidden sm:block">Logout</span>
          </button>
        )}
      </div>
    </nav>
  );
}
