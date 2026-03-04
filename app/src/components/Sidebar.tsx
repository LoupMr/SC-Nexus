"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Crosshair, BookOpen, ChevronLeft, ChevronRight, LogOut, KeyRound, Copy, RefreshCw, User, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";

const navItems = [
  { href: "/armory", label: "Armory", icon: Crosshair, description: "Item Database", adminOnly: false },
  { href: "/ledger", label: "Ledger", icon: BookOpen, description: "Inventory Tracker", adminOnly: false },
  { href: "/conquest-ops", label: "Operation Guide", icon: Shield, description: "Tactical Guide", adminOnly: false },
  { href: "/members", label: "Members", icon: Users, description: "Manage Org Members", adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, isAdmin, passkey, logout, fetchPasskey, regeneratePasskey } = useAuth();
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
    <aside
      className={clsx(
        "fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300",
        "bg-space-900/80 backdrop-blur-xl border-r border-glass-border",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-glass-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-holo/10 border border-holo/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-holo" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-holo glow-text tracking-wider">SC-NEXUS</h1>
              <p className="text-[10px] text-space-500 uppercase tracking-widest">Org Portal</p>
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
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-holo/10 text-holo border border-holo/20"
                  : "text-space-400 hover:text-space-200 hover:bg-space-800/50 border border-transparent"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 bg-holo rounded-r" />
              )}
              <item.icon className={clsx("w-5 h-5 flex-shrink-0", isActive && "drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]")} />
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
          <div className="px-3 py-2 rounded-lg bg-space-800/50 border border-space-700/30">
            <button
              onClick={() => setShowPasskey(!showPasskey)}
              className="flex items-center gap-2 text-[11px] text-space-400 hover:text-space-300 w-full"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Org Passkey</span>
            </button>
            {showPasskey && (
              <div className="mt-2 space-y-1.5">
                <div className="font-mono text-xs text-industrial tracking-widest text-center py-1 bg-space-900/60 rounded">
                  {passkey}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={copyPasskey}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1 rounded bg-space-900/40 text-space-400 hover:text-space-300 border border-space-700/20"
                  >
                    <Copy className="w-3 h-3" /> {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={regeneratePasskey}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1 rounded bg-space-900/40 text-space-400 hover:text-space-300 border border-space-700/20"
                  >
                    <RefreshCw className="w-3 h-3" /> New Key
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg border",
            ({ admin: "bg-industrial/10 border-industrial/30", logistics: "bg-success/10 border-success/30", ops: "bg-purple-500/10 border-purple-500/30" } as Record<string, string>)[user?.role || ""] || "bg-space-800/50 border-space-700/50"
          )}
        >
          <User className={clsx("w-5 h-5 flex-shrink-0", ({ admin: "text-industrial", logistics: "text-success", ops: "text-purple-400" } as Record<string, string>)[user?.role || ""] || "text-space-400")} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className={clsx("block text-xs font-medium leading-tight truncate", ({ admin: "text-industrial", logistics: "text-success", ops: "text-purple-400" } as Record<string, string>)[user?.role || ""] || "text-space-300")}>
                {user?.username}
              </span>
              <span className="block text-[10px] opacity-60 text-space-500">
                {({ admin: "Admin", logistics: "Logistics", ops: "Ops", viewer: "Viewer" } as Record<string, string>)[user?.role || "viewer"]}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-space-500 hover:text-danger hover:bg-danger/5 border border-transparent hover:border-danger/20 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-xs">Logout</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 text-space-500 hover:text-space-300 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
