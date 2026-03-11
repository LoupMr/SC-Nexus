"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Crosshair, BookOpen, BookMarked, ChevronLeft, ChevronRight, LogOut, KeyRound, Copy, RefreshCw, User, Users, Link2, Medal, UserCheck, Menu, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/context/useAuth";
import { useTheme } from "@/context/ThemeContext";
import clsx from "clsx";

const navItems = [
  { href: "/armory", label: "Armory", icon: Crosshair, description: "Item Database", adminOnly: false },
  { href: "/guide", label: "Guides", icon: BookMarked, description: "Org guides & tutorials", adminOnly: false },
  { href: "/ledger", label: "Ledger", icon: BookOpen, description: "Inventory Tracker", adminOnly: false },
  { href: "/conquest-ops", label: "Operation Guide", icon: Shield, description: "Tactical Guide", adminOnly: false },
  { href: "/merits", label: "Merits & Rewards", icon: Medal, description: "Service Record & Requisition", adminOnly: false },
  { href: "/roster", label: "Roster", icon: UserCheck, description: "Org Members & Ranks", adminOnly: false },
  { href: "/links", label: "Useful Links", icon: Link2, description: "Star Citizen Resources", adminOnly: false },
  { href: "/members", label: "Members", icon: Users, description: "Manage Org Members", adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin, passkey, logout, fetchPasskey, regeneratePasskey } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showPasskey, setShowPasskey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isAdmin && !passkey) fetchPasskey();
  }, [isAdmin, passkey, fetchPasskey]);

  const copyPasskey = () => {
    navigator.clipboard.writeText(passkey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 chamfer-sm bg-space-900/80 backdrop-blur-xl border border-glass-border flex items-center justify-center text-space-300 hover:text-holo hover:shadow-[0_0_8px_rgba(92,225,230,0.4)] transition-all"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

    <aside
      className={clsx(
        "fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300",
        "bg-[rgba(0,15,30,0.4)] backdrop-blur-xl border-r border-glass-border",
        "shadow-[0_0_12px_rgba(92,225,230,0.08)]",
        collapsed ? "w-[72px]" : "w-64",
        "max-lg:translate-x-0",
        !mobileOpen && "max-lg:-translate-x-full"
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-glass-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 chamfer-sm bg-holo/10 border border-holo/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(92,225,230,0.3)]">
            <Shield className="w-5 h-5 text-holo" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-holo glow-text mobiglas-heading tracking-[0.15em]">SC-NEXUS</h1>
              <p className="text-[10px] text-space-500 mobiglas-label tracking-[0.2em]">Org Portal</p>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 chamfer-sm transition-all duration-200 group relative",
                isActive
                  ? "bg-holo/10 text-holo border border-holo/30 shadow-[0_0_8px_rgba(92,225,230,0.25)]"
                  : "text-space-400 hover:text-space-200 hover:bg-space-800/50 border border-transparent hover:border-glass-border"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 bg-holo" />
              )}
              <item.icon className={clsx("w-5 h-5 flex-shrink-0", isActive && "drop-shadow-[0_0_6px_rgba(92,225,230,0.6)]")} />
              {!collapsed && (
                <div>
                  <span className="text-sm font-medium block leading-tight">{item.label}</span>
                  <span className="text-[10px] text-space-500 block">{item.description}</span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-3 space-y-2">
        {isAdmin && !collapsed && (
          <div className="px-3 py-2 chamfer-sm bg-space-800/50 border border-space-700/30">
            <button
              onClick={() => setShowPasskey(!showPasskey)}
              className="flex items-center gap-2 text-[11px] text-space-400 hover:text-space-300 w-full"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Org Passkey</span>
            </button>
            {showPasskey && (
              <div className="mt-2 space-y-1.5">
                <div className="font-mono text-xs text-industrial tracking-widest text-center py-1 bg-space-900/60 chamfer-sm tabular-nums">
                  {passkey}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={copyPasskey}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1 chamfer-sm bg-space-900/40 text-space-400 hover:text-space-300 border border-space-700/20 mobiglas-label"
                  >
                    <Copy className="w-3 h-3" /> {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={regeneratePasskey}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1 chamfer-sm bg-space-900/40 text-space-400 hover:text-space-300 border border-space-700/20 mobiglas-label"
                  >
                    <RefreshCw className="w-3 h-3" /> New Key
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <Link
          href="/profile"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 chamfer-sm border transition-colors",
            (user?.roles?.includes("admin") && "bg-industrial/10 border-industrial/30 hover:bg-industrial/15") ||
            (user?.roles?.includes("logistics") && "bg-success/10 border-success/30 hover:bg-success/15") ||
            (user?.roles?.includes("ops") && "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15") ||
            "bg-space-800/50 border-space-700/50 hover:bg-space-800"
          )}
        >
          {user?.avatarUrl ? (
            <Image src={user.avatarUrl} alt="User avatar" width={36} height={36} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-glass-border" unoptimized />
          ) : (
            <User className={clsx("w-5 h-5 flex-shrink-0", (user?.roles?.includes("admin") && "text-industrial") || (user?.roles?.includes("logistics") && "text-success") || (user?.roles?.includes("ops") && "text-purple-400") || "text-space-400")} />
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className={clsx("block text-xs font-medium leading-tight truncate", (user?.roles?.includes("admin") && "text-industrial") || (user?.roles?.includes("logistics") && "text-success") || (user?.roles?.includes("ops") && "text-purple-400") || "text-space-300")}>
                {user?.username}
              </span>
              <span className="block text-[10px] opacity-60 text-space-500">
                {(user?.roles ?? [user?.role ?? "viewer"]).map((r) => ({ admin: "Admin", logistics: "Logistics", ops: "Ops", raffle: "Raffle", guide: "Guide", viewer: "Viewer" }[r] || r)).join(", ")}
              </span>
            </div>
          )}
        </Link>

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 chamfer-sm text-space-500 hover:text-alert hover:bg-alert/5 border border-transparent hover:border-alert/20 transition-all mobiglas-label"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-xs">Logout</span>}
        </button>

        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2 chamfer-sm text-space-500 hover:text-space-300 transition-colors mobiglas-label"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
          {!collapsed && <span className="text-xs">{theme === "dark" ? "Light" : "Dark"}</span>}
        </button>

        <button
          onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}
          className="hidden lg:flex items-center justify-center w-full py-2 chamfer-sm text-space-500 hover:text-space-300 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex items-center justify-center w-full py-2 text-space-500 hover:text-space-300"
        >
          Close
        </button>
      </div>
    </aside>
    </>
  );
}
