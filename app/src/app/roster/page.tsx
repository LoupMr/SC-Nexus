"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { Users, Loader2 } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import PageHeader from "@/components/PageHeader";
import { useRouter } from "next/navigation";

const RANK_LABELS: Record<string, string> = {
  supreme_commander: "Supreme Commander",
  executive_commander: "Executive Commander",
  captain: "Captain",
  non_commissioned_officer: "Non-Commissioned Officer",
  operator: "Operator",
  black_horizon_group_ally: "Black Horizon Group Ally",
};

const RANK_ORDER: Record<string, number> = {
  supreme_commander: 0,
  executive_commander: 1,
  captain: 2,
  non_commissioned_officer: 3,
  operator: 4,
  black_horizon_group_ally: 5,
};

interface RosterEntry {
  username: string;
  rank: string;
  avatarUrl?: string | null;
}

export default function RosterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoster = useCallback(async () => {
    const res = await fetch("/api/roster");
    if (res.ok) setRoster(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    const id = setTimeout(() => void fetchRoster(), 0);
    return () => clearTimeout(id);
  }, [user, router, fetchRoster]);

  if (!user) return null;

  const sorted = [...roster].sort((a, b) => {
    const orderA = RANK_ORDER[a.rank] ?? 99;
    const orderB = RANK_ORDER[b.rank] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.username.localeCompare(b.username);
  });

  if (loading) {
    return (
      <>
        <PageHeader icon={Users} title="ROSTER" subtitle="Black Horizon Group — members and ranks" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-holo animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={Users}
        title="ROSTER"
        subtitle="Black Horizon Group — members and ranks"
      />

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] gap-4 px-5 py-3 border-b border-glass-border text-[11px] text-space-500 uppercase tracking-wider font-medium">
          <span>Member</span>
          <span>Rank</span>
        </div>

        <div className="divide-y divide-glass-border">
          {sorted.map((entry) => {
            const label = RANK_LABELS[entry.rank] || entry.rank.replace(/_/g, " ");
            const isSelf = user?.username === entry.username;

            return (
              <div
                key={entry.username}
                className="grid grid-cols-[1fr_auto] gap-4 items-center px-5 py-3 hover:bg-space-800/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {entry.avatarUrl ? (
                    <Image src={entry.avatarUrl} alt="Member avatar" width={32} height={32} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-holo/30" unoptimized />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border flex-shrink-0 bg-holo/10 border-holo/30 text-holo">
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-space-200 font-medium truncate">
                    {entry.username}
                    {isSelf && <span className="text-[10px] text-space-500 ml-2">(you)</span>}
                  </span>
                </div>
                <span className="text-xs font-medium text-space-400">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {roster.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-space-700 mx-auto mb-2" />
            <p className="text-space-500 text-sm">No members in roster.</p>
          </div>
        )}
      </div>
    </>
  );
}
