"use client";

import Link from "next/link";
import Image from "next/image";
import { Shield, User } from "lucide-react";
import { useAuth } from "@/context/useAuth";

const RANK_LABELS: Record<string, string> = {
  supreme_commander: "Supreme Commander",
  executive_commander: "Executive Commander",
  captain: "Captain",
  non_commissioned_officer: "NCO",
  operator: "Operator",
  black_horizon_group_ally: "BHG Ally",
  none: "—",
};

function getRankDisplay(rank: string | undefined): string {
  if (!rank || rank === "none") return "Operator";
  return RANK_LABELS[rank] ?? rank.replace(/_/g, " ");
}

export default function MobiglasHeader() {
  const { user } = useAuth();
  const rankDisplay = getRankDisplay(user?.rank);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 md:px-6 border-b border-glass-border mobiglas-header-bg backdrop-blur-xl shadow-[0_0_16px_rgba(92,225,230,0.08)]">
      {/* Left: User info or Guest */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href={user ? "/profile" : "/login"}
          className="flex items-center gap-2 chamfer-sm px-2 py-1.5 border border-transparent hover:border-glass-border hover:bg-space-800/40 transition-all"
        >
          {user?.avatarUrl ? (
            <Image src={user.avatarUrl} alt="User avatar" width={28} height={28} className="w-7 h-7 object-cover flex-shrink-0 border border-glass-border" unoptimized />
          ) : (
            <div className="w-7 h-7 chamfer-sm bg-holo/10 border border-holo/20 flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-holo" />
            </div>
          )}
          <div className="hidden sm:block min-w-0">
            <span className="block text-xs font-semibold text-space-200 truncate mobiglas-label">{user?.username ?? "Guest"}</span>
            <span className="block text-[10px] text-space-500 truncate">{user ? rankDisplay : "Log in to access"}</span>
          </div>
        </Link>
      </div>

      {/* Center: Org logo + branding */}
      <Link
        href={user ? "/dashboard" : "/"}
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 chamfer-sm px-3 py-1.5 border border-holo/20 hover:border-holo/40 transition-all"
      >
        <div className="w-8 h-8 chamfer-sm bg-holo/10 border border-holo/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_8px_rgba(92,225,230,0.3)]">
          <Shield className="w-4 h-4 text-holo" />
        </div>
        <div className="hidden sm:block">
          <span className="block text-xs font-bold text-holo glow-text mobiglas-heading tracking-[0.12em]">SC-NEXUS</span>
          <span className="block text-[9px] text-space-500 mobiglas-label tracking-[0.15em]">BLACK HORIZON GROUP</span>
        </div>
      </Link>
    </header>
  );
}
